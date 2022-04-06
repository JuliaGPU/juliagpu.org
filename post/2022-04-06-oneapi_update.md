+++
title = "oneAPI.jl status update"
author = "Tim Besard"
abstract = """
  It has been over a year since the last update on oneAPI.jl, the Julia package for programming Intel GPUs (and other accelerators) using the oneAPI toolkit. Since then, the package has been under steady development, and several new features have been added to improve the developer experience and usability of the package.
"""
+++

{{abstract}}


## `@atomic` intrinsics

oneAPI.jl [now supports](https://github.com/JuliaGPU/oneAPI.jl/pull/85) atomic operations,
which are required to implement a variety of parallel algorithms. Low-level atomic functions
(`atomic_add!`, `atomic_xchg!`, etc) are available as unexported methods in the oneAPI
module:

```julia
a = oneArray(Int32[0])

function kernel(a)
    oneAPI.atomic_add!(pointer(a), Int32(1))
    return
end

@oneapi items=256 kernel(a)
@test Array(a)[1] == 256
```

Note that these methods are only available for those types that are supported by the
underlying OpenCL intrinsics. For example, the `atomic_add!` from above can only be used
with `Int32` and `UInt32` inputs.

Most users will instead rely on the higher-level `@atomic` macro, which can be easily put in
front of many array operations to make them behave atomically. To avoid clashing with the
new `@atomic` macro in Julia 1.7, this macro is also unexported:

```julia
a = oneArray(Int32[0])

function kernel(a)
    oneAPI.@atomic a[1] += Int32(1)
    return
end

@oneapi items=256 kernel(a)
@test Array(a)[1] == 512
```

When used with operations that are supported by OpenCL, this macro will lower to calls like
`atomic_add!`. For other operations, a compare-and-exchange loop will be used. Note that for
now, this is still restricted to 32-bit operations, as we do not support the
`cl_khr_int64_base_atomics` extension for 64-bit atomics.


## Initial integration with vendor libraries

One significant missing features is the integration with vendor libraries like oneMKL. These
integrations are required to ensure good performance for important operations like matrix
multiplication, which currently fall-back to generic implementations in Julia that may not
always perform as good.

To improve this situation, we [are working
on](https://github.com/JuliaGPU/oneAPI.jl/pull/97) a wrapper library that allows us to
integrate with oneMKL and other oneAPI and SYCL libraries. Currently, only matrix
multiplication is supported, but once the infrastructural issues are worked out we expect to
quickly support many more operations.

If you need support for specific libraries, please have a look at this PR. As the API
surface is significant, we will need help to extend the wrapper library and integrate it
with high-level Julia libraries like LinearAlgebra.jl.


## Correctness issues

In porting existing Julia GPU applications to oneAPI.jl, we fixed several issues that caused
correctness issues when executing code on Intel GPUs:

- when the garbage collector frees GPU memory, [it now
  blocks](https://github.com/JuliaGPU/oneAPI.jl/pull/157) until all outstanding commands
  (which may include uses of said memory) are completes
- the `barrier` function to synchronize threads [is
  now](https://github.com/JuliaGPU/oneAPI.jl/pull/162) marked as `convert` to avoid LLVM
  miscompilations

Note that if you are using Tiger Lake hardware, there is currently a [known
issue](https://github.com/intel/compute-runtime/issues/522) in the back-end Intel compiler
that affects oneAPI.jl, causing correctness issues that can be spotted by running the
oneAPI.jl test suite.


## Future work

To significantly improve usability of oneAPI.jl, we will add support to the
KernelAbstraction.jl package. This library is used by [many other
packages](https://juliahub.com/ui/Packages/KernelAbstractions/aywHT/0.7.2?page=2) for adding
GPU acceleration to algorithms that cannot be easily expressed using only array operations.
As such, support for oneAPI.jl will make it possible to use your oneAPI GPUs with all of
these packages.
