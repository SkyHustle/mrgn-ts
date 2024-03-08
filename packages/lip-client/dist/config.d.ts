import { LipConfig } from "./types";
import { Infer } from "superstruct";
import { Environment } from "@mrgnlabs/marginfi-client-v2";
declare const LipConfigRaw: import("superstruct").Struct<{
    label: "production" | "alpha" | "staging" | "dev";
    cluster: string;
    program: string;
}, {
    label: import("superstruct").Struct<"production" | "alpha" | "staging" | "dev", {
        production: "production";
        alpha: "alpha";
        staging: "staging";
        dev: "dev";
    }>;
    cluster: import("superstruct").Struct<string, null>;
    program: import("superstruct").Struct<string, null>;
}>;
declare const ConfigRaw: import("superstruct").Struct<{
    label: "production" | "alpha" | "staging" | "dev";
    cluster: string;
    program: string;
}[], import("superstruct").Struct<{
    label: "production" | "alpha" | "staging" | "dev";
    cluster: string;
    program: string;
}, {
    label: import("superstruct").Struct<"production" | "alpha" | "staging" | "dev", {
        production: "production";
        alpha: "alpha";
        staging: "staging";
        dev: "dev";
    }>;
    cluster: import("superstruct").Struct<string, null>;
    program: import("superstruct").Struct<string, null>;
}>>;
export type LipConfigRaw = Infer<typeof LipConfigRaw>;
export type ConfigRaw = Infer<typeof ConfigRaw>;
/**
 * Retrieve config per environment
 */
export declare function getConfig(environment: Environment, overrides?: Partial<Omit<LipConfig, "environment">>): LipConfig;
export {};
//# sourceMappingURL=config.d.ts.map