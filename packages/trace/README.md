# @ariadne-thread/trace

The generated traceables and anchoring utility for **clew** itself.

clew is built with its own method — Code-Anchored Spec-Driven Development. Its specifications are compiled into typed **Traceables**, and its code anchors to them with `realizes`, `verifies`, and `concerns`. This package holds that generated output and the marker functions, and ships as a dependency of [`@ariadne-thread/clew`](https://www.npmjs.com/package/@ariadne-thread/clew).

You do not normally install this package directly. Install the CLI instead:

```bash
npm install -g @ariadne-thread/clew
```

In a project you manage with clew, the traceables and markers are generated into your own tree by `clew spec` (the TypeScript default is `src/clew/traceables`); you import them from there, not from this package.

## Documentation

https://github.com/ariadne-systems/clew

## License

Apache-2.0
