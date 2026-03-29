export default async () => {
  const { defineConfig } = await import("vitest/config");
  const path = await import("path");
  const { BASE_URL } = await import("./config");

  let apiAvailable = false;
  try {
    const response = await fetch(`${BASE_URL}/api/v1/status`);
    apiAvailable = response.ok;
  } catch {
    apiAvailable = false;
  }

  if (!apiAvailable) {
    console.warn(`[vitest] Skipping API integration tests because ${BASE_URL}/api/v1/status is unreachable`);
  }

  return defineConfig({
    test: {
      globalSetup: "./test/setup.ts",
      include: ["composables/**/*.test.ts", "lib/**/*.test.ts", "test/**/*.test.ts"],
      exclude: apiAvailable ? ["node_modules/**"] : ["lib/api/__test__/**/*.test.ts", "node_modules/**"],
      passWithNoTests: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, ".."),
        "~~": path.resolve(__dirname, ".."),
      },
    },
  });
};
