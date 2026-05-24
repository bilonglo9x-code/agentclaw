const origin = process.env.EXPO_ROUTER_ORIGIN || "https://mobile.vnsi.app";

module.exports = {
  expo: {
    name: "GoClaw",
    slug: "goclaw-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "goclaw-mobile",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#09090b",
    },
    ios: {
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#09090b",
      },
    },
    web: {
      favicon: "./assets/images/icon.png",
      backgroundColor: "#09090b",
      themeColor: "#09090b",
      display: "standalone",
      shortName: "GoClaw",
      description: "GoClaw AI Agent Platform",
      meta: {
        viewport:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
        "apple-mobile-web-app-capable": "yes",
        "apple-mobile-web-app-status-bar-style": "black-translucent",
        "apple-mobile-web-app-title": "GoClaw",
        "mobile-web-app-capable": "yes",
      },
    },
    plugins: [
      [
        "expo-router",
        {
          origin,
        },
      ],
      "expo-font",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
