+++
title = "Metal.jl 0.2: Metal Performance Shaders"
author = "Tim Besard"
abstract = """
  Metal.jl 0.2 marks a significant milestone in the development of the Metal.jl package.
  The release comes with initial support for the Metal Perform Shaders (MPS) framework for
  accelerating common operations like matrix multiplications, as well as various
  improvements for writing Metal kernels in Julia."""
+++

{{abstract}}


## Metal Performance Shaders

Quoting the [Apple
documentation](https://developer.apple.com/documentation/metalperformanceshaders), The Metal
Performance Shaders (MPS) framework contains a collection of highly optimized compute and
graphics shaders for use in Metal applications. With Metal.jl 0.2, we have added initial
support for this framework, and used it to accelerate the matrix multiplication operation:

```julia-repl
julia> using Metal, BenchmarkTools
julia> n = p = m = 2048
julia> flops = n*m*(2p-1)
17175674880

julia> a = MtlArray(rand(Float32, n, p));
julia> b = MtlArray(rand(Float32, p, m));
julia> c = MtlArray(zeros(Float32, n, m));

julia> bench = @benchmark Metal.@sync mul!(c, a, b)
BenchmarkTools.Trial: 518 samples with 1 evaluation.
 Range (min … max):  9.366 ms …  13.354 ms  ┊ GC (min … max): 0.00% … 0.00%
 Time  (median):     9.629 ms               ┊ GC (median):    0.00%
 Time  (mean ± σ):   9.646 ms ± 192.169 μs  ┊ GC (mean ± σ):  0.00% ± 0.00%

               ▃▂▅▅▆▆▆▇█▇▇▆▅▄▄▁▁ ▁
  ▄▁▄▄▄▄▆▆▆▄▄▁▇█████████████████▄█▄▁▆▁▄▁▆▁▇▁▄▄▁▁▄▄▇▁▄▆▄▁▁▁▁▁▄ █
  9.37 ms      Histogram: log(frequency) by time      10.1 ms <

 Memory estimate: 352 bytes, allocs estimate: 12.

julia> flops / (minimum(bench.times)/1e9)
1.83e12
```

The benchmark above shows that on an 8-core M1 Pro matrix multiplication now reaches 1.8
TFLOPS (out of the 2.6TFLOPS of theoretical performance). The accelerated matrix
multiplication is available for a variety of input types, incuding mixed-mode operations,
and as shown above is integrated with the LinearAlgebra.jl `mul!` interface.

Of course, the MPS framework offers more than just matrix multiplication, and we expect to
support more of it in the future. If you have a specific operation you would like to use
from Julia, please let us know by opening an issue on the Metal.jl repository.


## GPU profiling support

To support the development of Metal kernels,
[Max Hawkins](https://github.com/max-Hawkins) has added support for GPU profiling.
Similar to how this works in CUDA.jl, you can run code under the `Metal.@profile` macro to
record its execution. However, this does first require setting the `METAL_CAPTURE_ENABLED`
environment flag *before* import Metal.jl:

```julia-repl
julia> ENV["METAL_CAPTURE_ENABLED"] = 1

julia> using Metal

julia> a = mtl(rand(1024, 1024))
julia> Metal.@profile sum(a)
[ Info: GPU frame capture saved to jl_metal.gputrace/
```

The resulting capture can be opened with Xcode, presenting a timeline that's similar to
other profilers:

{{img "xcode.png" "XCode viewing a Metal.jl capture trace" }}


## Other improvements

- Julia 1.9 is supported, but requires an up-to-date macOS version (issues have been
  encountered on macOS 12.4);
- An `mtl` function has been added for converting Julia arrays to Metal arrays, similar to the
  `cu` function in CUDA.jl;
- Multiple GPUs are supported, and the `device!` function can be used to select one;
- Coverage for SIMD Group functions has been improved, so it's is now possible to use
  `simdgroup_load`, `simdgroup_store`, `simdgroup_multiply`, and
  `simdgroup_multiply_accumulate` in kernels functions.


## Future work

Although Metal.jl is now usable for a variety of applications, there is still work to be
done before it can be considered production-ready. In particular:

- there are known performance issues with `mapreduce`, and other operations that realy on
  `CartesianIndices`;
- the `libcmt` wrapper library for interfacing with the Metal APIs is cumbersome to use
  and improve, and we are looking into native ObjectiveC FFI instead;
- the MPS wrappers are incomplete, and similar to the Metal APIs requires a replacement
  to `libcmt` to be improved;
- support for atomic operations is missing, which is required to implement a full-featured
  KernelAbstractions.jl back-end.

Once (most of) these issues are addressed, we should be able to release Metal.jl 1.0.
