module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo already wires up expo-router and the Reanimated/worklets
  // transform for SDK 57 — adding the worklets plugin by hand here applies it
  // twice and breaks the build.
  return { presets: ['babel-preset-expo'] };
};
