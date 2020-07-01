---
title: "AMD ROCm"
---

[![][docs-master-img]][docs-master-url]

[docs-master-img]: https://img.shields.io/badge/docs-master-blue.svg
[docs-master-url]: https://juliagpu.gitlab.io/AMDGPUnative.jl/

The Julia programming support for AMD GPUs based on the ROCm platform aims to provide
similar capabilities as the [NVIDIA CUDA](/cuda/) stack, with support for both low-level
kernel programming as well as an array-oriented interface. It is similarly comprised of
multiple packages:

- [HSARuntime.jl](https://github.com/jpsamaroo/HSARuntime.jl): interfacing with the HSA runtime
- [AMDGPUnative.jl](https://github.com/JuliaGPU/AMDGPUnative.jl): GPU kernel programming support
- [ROCArrays.jl](https://github.com/jpsamaroo/ROCArrays.jl): array programming interface

At this point, the toolchain is **highly experimental**, and does not fully work on an
out-of-the-box version of Julia.
