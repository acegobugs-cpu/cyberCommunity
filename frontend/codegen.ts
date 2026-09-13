import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Generates TypeScript types for the Learn GraphQL API straight from the
 * service's schema, so the frontend cannot drift from the backend contract.
 *   npm run codegen
 */
const config: CodegenConfig = {
  schema: "../learn/src/main/resources/graphql/schema.graphqls",
  documents: ["src/graphql/**/*.graphql"],
  generates: {
    "src/graphql/generated.ts": {
      // typescript-operations v6 emits the enums/inputs it references itself; adding the
      // "typescript" plugin would duplicate them.
      plugins: ["typescript-operations"],
      config: {
        scalars: { ID: "string" },
        skipTypename: true,
      },
    },
  },
};

export default config;
