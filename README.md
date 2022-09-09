# [Functionland's](https://fx.land/) Mobile Apps Monorepo

This is the monorepo using [nx](https://nx.dev) that contains the source for the **Blox App**, **File Sync App**, and Design System **component library** projects.

<table>
  <tr>
    <td width="35%">
    <p>Blox<p>
    <img src="https://user-images.githubusercontent.com/17250443/189409007-ffa2cf49-98db-4f48-9ed2-899a56b44848.gif" />
    </td>
    <td width="35%">
    <p>File Sync<p>
    <img src="https://user-images.githubusercontent.com/17250443/189410320-8536a82e-7abf-4b53-bab2-1f6b8d79d65a.gif" />
    </td>
  </tr>
</table>

## About the Apps

Functionland's FxBlox hardware is managed and used by the `File Sync` and `Blox` apps. `Blox` and `File Sync` can be used independently of each other. The `Blox` app is responsible for managing, controlling and configuring the FxBlox hardware as well as the setup / linking of wallets for to receiving Fula (rewards) tokens. If you have FxBlox hardware, you will need the Blox app. The `File Sync` app is responsible for utilizing the FxBlox hardware as a decentralized storage solution for your data.

> Note: The word "box" is used interchangeably for "blox"

<br>

# Quick start:

In the root run `yarn` followed by `yarn ios`. - See our STYLEGUIDE [here](https://github.com/functionland/apps-monorepo/blob/main/STYLEGUIDE.md)

<br>

# Development

## Getting started with development

In the project root run `yarn install`, this will install all the required dependencies across all the projects.

#### Requirements

Setup your development environment according to [react native setup documentation](https://reactnative.dev/docs/environment-setup)

Additional requirements:

- CMake 3.10.2 (Android only, available through Android Studio)
- `nx` as a global dependency (optional).

It is easiest to develop in a Unix based environment as there is currently an [issue](https://github.com/functionland/apps-monorepo/issues/224) open for Windows in relation to CMake.

#### To run the iOS apps in development

```sh
yarn ios file-manager
```

```sh
yarn ios box
```

#### To run the Android apps in development

```sh
yarn android file-manager
```

```sh
yarn android box
```

Running these commands will install the required native dependencies via Gradle or Cocoapods.

These commands are shorthand for: `nx start [app]` followed by `nx run-ios [app]`.

The default project is `box`

## Project structure

There are 3 core parts to the folder structure:

- [Component Library](https://github.com/functionland/apps-monorepo/tree/main/libs/component-library) (Completed):
  - 📁 `libs/component-library`
    - 📄 `src/index.ts` exports all components from the component library in `src/lib`
- [Blox](https://github.com/functionland/apps-monorepo/tree/main/apps/box) app (WIP):
  - 📁 `apps/box`
    - 📁 `src`: Contains the actual TypeScript + React-Native FB mobile for the Blox app.
    - 📁 `ios`: Contains the basic skeleton for a React Native iOS app, plus the native
    - 📁 `android`: Contains the basic skeleton for a React Native Android app, plus the native
- [File Sync](https://github.com/functionland/apps-monorepo/tree/main/apps/file-manager) app (To Do):
  - 📁 `apps/file-manger`
    - 📁 `src`: Contains the actual TypeScript + React-Native FB mobile for the File Sync app.
    - 📁 `ios`: Contains the basic skeleton for a React Native iOS app, plus the native
    - 📁 `android`: Contains the basic skeleton

The designs for the app can be found under the design files folder [`design-files`](https://github.com/functionland/apps-monorepo/tree/main/design-files)

## Restyle

A core library to this monorepo is [Shopify's restyle library](https://github.com/Shopify/restyle). This ensures a consistent design language when developing the apps and enables easy plug and play theming with light and dark themes (or any other). We have setup base light and dark themes in the component library [theme.ts file](https://github.com/functionland/apps-monorepo/blob/main/libs/component-library/src/lib/theme/theme.ts). The `Blox` and `File sync` apps can implement this theme directly or hydrate their own themes from these base themes. See our [style guide rules](https://github.com/functionland/apps-monorepo/blob/main/STYLEGUIDE.md) for more info.

# Contributing to the Monorepo

You can contribute by beta testing or by submitting code to either apps (File Sync and Blox) or submitting code to the component library.
If you plan to make a contribution please do so through [our contribution steps](#contribution-steps). You can also join us on Discord to discuss ideas.

When submitting code, please make every effort to follow existing [conventions and style](https://github.com/functionland/apps-monorepo/blob/main/STYLEGUIDE.md) in order to keep the code as readable as possible.

Please always be respectful when contributing.

<br>

## How To Run locally?

See [Getting started](#getting-started-with-development)

## Submitting a PR

- For every PR there should be an accompanying [issue](https://github.com/functionland/apps-monorepo/issues) which the PR solves. If there isn't one please create it.

- The PR itself should only contain code which is the solution for the given issue

- If you are a first time contributor check if there is a [good first issue](https://github.com/functionland/apps-monorepo/labels/good%20first%20issue) for you

## Contribution steps

1. Fork this repository to your own repositiry.

2. Clone the forked repositiry to your local machine.

3. Create your feature branch: `git checkout -b my-new-feature`

4. Make changes to the project.

5. Commit your changes: `git commit -m 'Add some feature'`

6. Push to the branch: `git push origin my-new-feature`

7. Submit a pull request :D

## License

By contributing your code, you agree to license your contribution under the terms of the [MIT License](https://github.com/functionland/apps-monorepo/blob/main/LICENSE) license.

All files are released with the MIT License license.

# Misc

### Unresolved branches

[Rewards Screen](https://github.com/functionland/apps-monorepo/tree/feat/rewards-screen) branch relating to the rewards screen is unresolved and in a [draft PR](https://github.com/functionland/apps-monorepo/pull/229).
