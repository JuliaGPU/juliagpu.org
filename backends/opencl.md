+++
title = "OpenCL"
+++

# OpenCL

~~~
<p>
  <a href="https://github.com/JuliaGPU/OpenCL.jl">
    <img src="https://img.shields.io/github/stars/JuliaGPU/OpenCL.jl?style=social" alt>
  </a>
</p>
~~~

For GPUs that support the vendor-neutral OpenCL standard, the
[OpenCL.jl](https://github.com/JuliaGPU/OpenCL.jl/) package provides a Julia
interface to the OpenCL programming model. The package is in the early stages of
a rewrite, switching from the traditional OpenCL C-based kernel programming
model to a native Julia interface that matches the rest of the JuliaGPU
ecosystem.

The package can both be used with system-installed OpenCL runtimes, or with a
Julia-distributed OpenCL runtime such as `pocl_jll.jl`:

```julia-repl
julia> using OpenCL

julia> OpenCL.versioninfo()
OpenCL.jl version 0.10.0

Toolchain:
 - Julia v1.10.5
 - OpenCL_jll v2024.5.8+1

Available platforms: 3
 - Portable Computing Language
   version: OpenCL 3.0 PoCL 6.0  Linux, Release, RELOC, SPIR-V, LLVM 15.0.7jl, SLEEF, DISTRO, POCL_DEBUG
   · cpu-haswell-AMD Ryzen 9 5950X 16-Core Processor (fp64, il)
 - NVIDIA CUDA
   version: OpenCL 3.0 CUDA 12.6.65
   · NVIDIA RTX 6000 Ada Generation (fp64)
 - Intel(R) OpenCL Graphics
   version: OpenCL 3.0
   · Intel(R) Arc(TM) A770 Graphics (fp16, il)
```
