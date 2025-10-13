import typescript from '@rollup/plugin-typescript';

export default {
  input: ["src/post-login-action.ts"],
  output: {
    strict: false,
    format: "cjs",
    dir: "dist"
  },
  external: [],
  plugins: [
    typescript({ module: 'es6' })
  ]
};
