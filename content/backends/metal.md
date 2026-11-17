+++
title = "Apple Metal"
description = "GPU programming on Apple silicon, with array operations, kernel programming and Metal Performance Shaders."
weight = 4

[[params.packages]]
name = "Metal.jl"
repository = "https://github.com/JuliaGPU/Metal.jl"
documentation = "https://metal.juliagpu.org/stable/"
+++

Metal is a compute shader API that can be used to program GPUs found in Apple hardware. The
[Metal.jl](https://github.com/JuliaGPU/Metal.jl) package makes it possible to do so from
Julia, with support for Mac devices that contain an M-series chip. The package is in early
development, but already provides most features for application development.

Similarly to other GPU support packages in Julia, Metal.jl makes it possible to work with
accelerators at three distinct abstraction levels:

- high-level, using the `MtlArray` array type and Julia's powerful array abstractions;
- by writing your own kernels and launching them using the `@metal` macro;
- using the low-level Metal API wrappers in the `MTL` submodule.

For more information, refer to the [introductory blog post](/post/2022-06-24-metal/) and the [post on Metal Performance Shaders](/post/2023-03-03-metal_0.2/).
