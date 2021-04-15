# VU Mods + Typescript

![expressive image of satisfaction when working with typescript](./yeah.jpg)

This is a boilerplate repository for writing mods for venice unleashed with typescript instead of lua.
Actually, the typescript code is compiled to lua. But you still have all the nice typescript gains during development!

The repository contains demo code that was intended to be a anti-cheat mod. But I am too lazy to continue - but you
might want to look into it to learn and get inspiration.

Thanks to [TypeScriptToLua](https://github.com/TypeScriptToLua/TypeScriptToLua) and
[typescript-tstl-plugin](https://github.com/TypeScriptToLua/typescript-tstl-plugin).

## Prerequisites
- [Node.js](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/) (or npm)

## Getting started

```
# First setup: install dependencies
yarn install

# Compiles typescript to lua (automatically when files change!)
yarn dev
```

## Folder structure:

- `ext/`
    - `client/`
        - `__init__.ts`
          > client side entry point of your VU mod
    - `server/`
        - `__init__.ts`
          > server side entry point of your VU mod
    - `shared/`
      > common code shared with `client/` and `server/`
- `node_modules/`
  > The node dependencies. Here lives typescript and the lua transpiler. Don't touch
- `rime-dump/`
  > This is a dump of [Venice-EBX](https://github.com/EmulatorNexus/Venice-EBX). I did not include it in vu-typescript-mod, but you might want to clone Venice-EBX yourself.
- `typings/`
  > Auto-generated typescript typings from the latest VU docs
- `package.json`
  > The typescript/nodejs part of your mod. Don't touch it unless you know what you're doing
- `mod.json`
  > Your VU mod.json to describe your mod. Basically just some meta data
- `tsconfig.json`
  > The typscript configuration file. Just don't touch it. It works
- `vu-printer.ts`
  > Some utility to correctly translate typescript to lua that VU wants. It fixes imports and provides you with
  > syntactic sugar!
- `yarn.lock`
  > Locks the node dependencies form the package.json in place. Just don't touch it.

## EBX Access (syntactic sugar!!!)

The following typescript code:

```ts
const jumpStateDataInstance = TSUtils.RetrieveEBXInstance<FB.JumpStateData>('Characters/Soldiers/DefaultSoldierPhysics');
```

will be translated at **compile time** to the following lua code:

```lua
local jumpStateDataInstance = ResourceManager:FindInstanceByGuid(
    Guid("235CD1DA-8B06-4A7F-94BE-D50DA2D077CE"),
    Guid("3129BCFE-000E-4001-9F8F-316E5835C9FC")
)
```

> This feature requires that you have the `rime-dump/` in place and up-to-date.

A full use case in typescript might look like this:
```ts
const jumpStateDataInstance = TSUtils.RetrieveEBXInstance<FB.JumpStateData>('Characters/Soldiers/DefaultSoldierPhysics');
if (!jumpStateDataInstance) {
    print(`jumpStateDataInstance not found`);
} else {
    print(`jumpStateDataInstance found`);
    const jumpStateData = new FB.JumpStateData(jumpStateDataInstance);
    jumpStateData.MakeWritable();
    jumpStateData.jumpHeight = 4;
}
```
