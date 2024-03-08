"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const web3_js_1 = require("@solana/web3.js");
const superstruct_1 = require("superstruct");
const configs_json_1 = __importDefault(require("./configs.json"));
const LipConfigRaw = (0, superstruct_1.object)({
    label: (0, superstruct_1.enums)(["production", "alpha", "staging", "dev"]),
    cluster: (0, superstruct_1.string)(),
    program: (0, superstruct_1.string)(),
});
const ConfigRaw = (0, superstruct_1.array)(LipConfigRaw);
function parseConfig(configRaw) {
    return {
        environment: configRaw.label,
        cluster: configRaw.cluster,
        programId: new web3_js_1.PublicKey(configRaw.program),
    };
}
/**
 * Parse Configs
 */
function parseConfigs(configRaw) {
    return configRaw.reduce((config, current, _) => ({
        [current.label]: parseConfig(current),
        ...config,
    }), {});
}
function loadDefaultConfig() {
    (0, superstruct_1.assert)(configs_json_1.default, ConfigRaw);
    return parseConfigs(configs_json_1.default);
}
/**
 * Define lip-specific config per profile
 *
 * @internal
 */
function getLipConfig(environment, overrides) {
    const defaultConfigs = loadDefaultConfig();
    switch (environment) {
        case "production":
        case "alpha":
        case "staging":
        case "dev":
            const defaultConfig = defaultConfigs[environment];
            return {
                environment,
                programId: overrides?.programId || defaultConfig.programId,
                cluster: overrides?.cluster || defaultConfig.cluster,
            };
        default:
            throw Error(`Unknown environment ${environment}`);
    }
}
/**
 * Retrieve config per environment
 */
function getConfig(environment, overrides) {
    return {
        ...getLipConfig(environment, overrides),
    };
}
exports.getConfig = getConfig;
