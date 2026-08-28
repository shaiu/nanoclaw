import type { AgentProvider, ProviderOptions } from './types.js';
import { getProviderFactory } from './provider-registry.js';
import { getProviderRuntimeContract } from './provider-registry.js';
import {
  bindProviderRuntimeInputs,
  maybeRotateProviderContinuation,
  resolveRuntimeConfiguration,
  runProviderAfterExchange,
  runProviderBeforeQuery,
} from '../provider-contracts/realize.js';
import type { RuntimeConfigurationInputs } from '../provider-contracts/registry.js';

export function createProvider(name: string, options: ProviderOptions = {}): AgentProvider {
  const contract = getProviderRuntimeContract(name);
  // The core-owned inputs for this instance: one object, owned here, closed
  // over by the render path below.
  const inputs: Partial<RuntimeConfigurationInputs> = {
    inference: { model: options.model, effort: options.effort, speed: options.speed },
    mcpServers: options.mcpServers ?? {},
  };
  // Core resolves the declared configuration and hands the result to the
  // provider; the provider does not call its own resolves.
  const configuration = contract ? resolveRuntimeConfiguration(contract, inputs) : undefined;
  const provider = getProviderFactory(name)(options, configuration);
  if (contract) {
    bindProviderRuntimeInputs(provider, inputs);

    if (contract.lifecycle?.beforeQuery) {
      const query = provider.query.bind(provider);
      provider.query = (input) => {
        runProviderBeforeQuery(name, inputs);
        return query(input);
      };
    }

    if (contract.history?.afterExchange) {
      provider.onExchangeComplete = (exchange) => {
        runProviderAfterExchange(name, exchange);
      };
    }

    // Core owns continuation rotation for contract providers: the provider
    // class does not implement maybeRotateContinuation itself.
    if (contract.history?.rotateContinuation) {
      provider.maybeRotateContinuation = (continuation) =>
        maybeRotateProviderContinuation(name, continuation, options.assistantName, (message) =>
          console.error(`[${name}-provider] ${message}`),
        );
    }
  }
  return provider;
}
