-include .env

# Default values
DEFAULT_NETWORK := $(shell grep 'default_network' foundry.toml | cut -d '"' -f2)
FORK_NETWORK := $(shell grep 'mainnet =' foundry.toml | cut -d '"' -f2)

$(info Default Network: $(DEFAULT_NETWORK))

# Custom network can be set via make network=<network_name>
network ?= $(DEFAULT_NETWORK)
$(info Network: $(network))

# Access PRIVATE_KEY from .env
PRIVATE_KEY := $(PRIVATE_KEY)

# Extract verifier and network URLs from foundry.toml
VERIFIER := $(shell grep 'verifier =' foundry.toml | cut -d '"' -f2)
NETWORK_URL := $(shell awk -F ' = ' '/^\[$$/{p=0} p && $$1 == "$(network)" {print $$2} /^\[rpc_endpoints\]/{p=1}' foundry.toml | tr -d '"')


$(info Network URL: $(NETWORK_URL))

# Ensure NETWORK_URL is not empty
ifeq ($(strip $(NETWORK_URL)),)
$(error NETWORK_URL is not set for network '$(network)'. Please check your foundry.toml configuration.)
endif

.PHONY: account chain compile deploy-core deploy-gtxOracle deploy-verify-core deploy-verify-gtxOracle flatten fork format generate lint test verify

# Helper function to run forge script
define forge_script
	forge script $(1) --rpc-url $(NETWORK_URL) --broadcast --legacy --private-key $(PRIVATE_KEY) $(2)
endef

# Define a target to deploy core contracts using the specified network
deploy-core: build
	$(call forge_script,script/DeployEigenLayerCore.s.sol,)

# Define a target to deploy gtxOracle contracts using the specified network
deploy-gtxOracle: build
	$(call forge_script,script/GTXOracleDeployer.s.sol,)

# Define a target to verify core deployment using the specified network
deploy-verify-core: build
	$(call forge_script,script/DeployEigenLayerCore.s.sol,--verify)

# Define a target to verify gtxOracle deployment using the specified network
deploy-verify-gtxOracle: build
	$(call forge_script,script/GTXOracleDeployer.s.sol,--verify)

# Define a target to verify contracts using the specified network
verify: build
	forge script script/VerifyAll.s.sol --ffi --rpc-url $(NETWORK_URL) --private-key $(PRIVATE_KEY)

# Define a target to compile the contracts
compile:
	forge compile

# Define a target to run tests
test:
	forge test

# Define a target to lint the code
lint:
	forge fmt

# Define a target to build the project
build:
	forge build --build-info --build-info-path out/build-info/

# Define a target to display help information
help:
	@echo "Makefile targets:"
	@echo "  deploy-core          - Deploy core contracts using the specified network"
	@echo "  deploy-gtxOracle     - Deploy gtxOracle contracts using the specified network"
	@echo "  deploy-verify-core   - Deploy and verify core contracts using the specified network"
	@echo "  deploy-verify-gtxOracle - Deploy and verify gtxOracle contracts using the specified network"
	@echo "  verify               - Verify contracts using the specified network"
	@echo "  compile              - Compile the contracts"
	@echo "  test                 - Run tests"
	@echo "  lint                 - Lint the code"
	@echo "  help                 - Display this help information"