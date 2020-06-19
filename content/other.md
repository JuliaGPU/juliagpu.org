---
title: "Other"
---

Several other back-ends exist, not all of them with the same level of polish or
support as the NVIDIA and AMD back-ends.

## OpenCL

Programming OpenCL GPUs in Julia is much more limited than other supported platforms. On
recent versions of Julia, only [OpenCL.jl](https://github.com/JuliaGPU/OpenCL.jl) is
available. This package can be used to compile and execute GPU kernels written in OpenCL C.


## oneAPI

Support for the oneAPI programming model is a work in progress, and can be found
in the unregistered [oneAPI.jl](https://github.com/JuliaGPU/oneAPI.jl) package.
The package aims to offer the same level of programmability as the Julia CUDA
stack, i.e., both offering an array-based and kernel programming model.
