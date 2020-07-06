---
title: "AMD ROCm"
---

[![][docs-latest-img]][docs-latest-url] [![][github-stars-img]][github-stars-url]

[docs-latest-img]: https://img.shields.io/badge/docs-latest-blue.svg
[docs-latest-url]: https://juliagpu.gitlab.io/AMDGPU.jl/

[github-stars-img]: https://img.shields.io/github/stars/JuliaGPU/AMDGPU.jl?style=social
[github-stars-url]: https://github.com/JuliaGPU/AMDGPU.jl

The Julia programming support for AMD GPUs based on the ROCm platform aims to
provide similar capabilities as the [NVIDIA CUDA](/cuda/) stack, with support
for both low-level kernel programming as well as an array-oriented interface.

Julia support exists in the form of a single package:

- [AMDGPU.jl](https://github.com/JuliaGPU/AMDGPU.jl)

This package contains everything needed to access the HSA runtime, program GPU
kernels, and utilize a user-friendly array-based interface. The stack
originally was divided into 3 separate packages, which still exist and may be
of use for interested users and developers:

- [HSARuntime.jl](https://github.com/JuliaGPU/HSARuntime.jl): interfacing with the HSA runtime
- [AMDGPUnative.jl](https://github.com/JuliaGPU/AMDGPUnative.jl): GPU kernel programming support
- [ROCArrays.jl](https://github.com/JuliaGPU/ROCArrays.jl): array programming interface

At this point, the toolchain is a work in progress, although it is quite
functional for simple usecases. We only officially support Julia 1.4 and Julia
1.5.
