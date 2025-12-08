import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

// Custom TypeScript rules to add
const customRules = {
  "@typescript-eslint/array-type": "off",
  "@typescript-eslint/consistent-type-definitions": "off",
  "@typescript-eslint/consistent-type-imports": [
    "warn",
    {
      prefer: "type-imports",
      fixStyle: "inline-type-imports",
    },
  ],
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
    },
  ],
  "@typescript-eslint/require-await": "off",
  "@typescript-eslint/no-misused-promises": [
    "error",
    {
      checksVoidReturn: {
        attributes: false,
      },
    },
  ],
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/no-unsafe-call": "off",
};

// Merge custom rules into the nextConfig
const config = nextConfig.map((configItem) => {
  // Add custom rules to the TypeScript config
  if (configItem.name === "next/typescript") {
    return {
      ...configItem,
      rules: {
        ...configItem.rules,
        ...customRules,
      },
    };
  }
  return configItem;
});

export default config;
