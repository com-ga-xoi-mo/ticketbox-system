// Metro config for running this Expo app inside an npm-workspaces monorepo.
// The workspace hoists a different React (apps/web pins React 18) to the repo
// root, while this app needs React 19 (Expo SDK 54 / RN 0.81). Without this
// config Metro resolves the hoisted React 18 and the app crashes on load with
// "Cannot read property 'S' of undefined" (React 19 ReactSharedInternals).
//
// Fix: watch the workspace root for shared packages, but resolve node_modules
// from THIS app first and disable hierarchical lookup so React/React Native
// always come from apps/checkin-mobile/node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch shared packages (e.g. @ticketbox/api-types) at the workspace root.
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from the app first, then fall back to the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force a single copy of React from THIS app, so the hoisted React 18 at the
//    workspace root can never be pulled into the bundle. Only `react` conflicts
//    (apps/web pins React 18); react-native is hoisted with a single version and
//    resolves fine from the workspace root via nodeModulesPaths above.
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
};

module.exports = config;
