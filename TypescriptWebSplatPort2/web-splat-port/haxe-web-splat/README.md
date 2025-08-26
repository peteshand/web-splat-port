## Testing locally

### Code completion:

1. Install the `haxe language support` vscode extension
2. Install `haxe 4.2.2` (https://haxe.org/download/)



# Installing for Apple Silicon

If you try installing `haxe@5.2.1` on Apple Silicon (M1/M2) you may see an error like this:

```bash
npm error code EBADPLATFORM
npm error notsup Unsupported platform for haxe@5.2.1: wanted {"os":"win32,win64,darwin,linux","cpu":"x64,ia32"} (current: {"os":"darwin","cpu":"arm64"})
npm error notsup Valid os:   win32,win64,darwin,linux
npm error notsup Actual os:  darwin
npm error notsup Valid cpu:  x64,ia32
npm error notsup Actual cpu: arm64
```

## Steps to Resolve

1. Install Rosetta (if you haven’t already):

```bash
softwareupdate --install-rosetta
```

2. Run your terminal under Rosetta:

```bash
arch -x86_64 zsh
```

3. Inside that Rosetta shell, install Haxe:

```bash
npm install haxe@5.2.1
```
