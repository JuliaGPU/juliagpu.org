+++
title = "Metal"
+++

# Metal

~~~
<p>
  <a href="https://github.com/JuliaGPU/Metal.jl">
    <img src="https://img.shields.io/github/stars/JuliaGPU/Metal.jl?style=social" alt>
  </a>
</p>
~~~

Metal is a compute shader API that can be used to program GPUs found in Apple hardware. The
[Metal.jl](https://github.com/JuliaGPU/Metal.jl) package makes it possible to do so from
Julia, with support for Mac devices that contain an M-series chip. The package is in early
development, but already provides most features for application development.

Similarly to other GPU support packages in Julia, Metal.jl makes it possible to work with
accelerators at three distinct abstraction levels:

- high-level, using the `MtlArray` array type and Julia's powerful array abstractions;
- by writing your own kernels and launching them using the `@metal` macro;
- using the low-level Metal API wrappers in the `MTL` submodule.

For more information, refer to the [introductory blog post](/post/2022-06-24-metal/).
