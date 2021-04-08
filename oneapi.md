+++
title = "Intel oneAPI"
+++

# Intel oneAPI

~~~
<p>
  <a href="https://github.com/JuliaGPU/oneAPI.jl">
    <img src="https://img.shields.io/github/stars/JuliaGPU/oneAPI.jl?style=social" alt>
  </a>
</p>
~~~

oneAPI is an open standard for programming hardware accelerators, originally designed by Intel. The [oneAPI.jl](https://github.com/JuliaGPU/oneAPI.jl) package offers a Julia interface to this programming model. The package is in early development, but already provides most features for application development.

Similarly to other GPU support packages in Julia, oneAPI.jl makes it possible to work with accelerators at three distinct abstraction levels:

- high-level, using the `oneArray` array type and Julia's powerful array abstractions;
- by writing your own kernels and launching them using the `@oneapi` macro;
- using the low-level Level Zero wrappers in the `oneL0` submodule.

For more information, refer to the [introductory blog post]("/post/2020-11-05-oneapi_0.1/").
