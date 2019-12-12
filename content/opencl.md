---
title: "OpenCL"
---

Programming OpenCL GPUs in Julia is much more limited than other supported platforms. On
recent versions of Julia, only [OpenCL.jl](https://github.com/JuliaGPU/OpenCL.jl) is
available. This package can be used to compile and execute GPU kernels written in OpenCL C.

There used to exist packages for writing OpenCL kernels in Julia, specifically
[CLArrays.jl](https://github.com/JuliaGPU/CLArrays.jl) built on
[Transpiler.jl](https://github.com/SimonDanisch/Transpiler.jl), but this software is not
maintained and only works on Julia 0.6 or older.
