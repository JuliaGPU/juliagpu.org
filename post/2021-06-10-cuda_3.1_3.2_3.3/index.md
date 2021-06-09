+++
title = "CUDA.jl 3.1, 3.2 and 3.3"
author = "Tim Besard"
abstract = """
  There have been several releases of CUDA.jl in the past couple of months, with many bugfixes and several exciting new features to improve GPU programming in Julia: `CuArray` now supports isbits Unions, CUDA.jl can emit debug info for use with NVIDIA tools, and changes to the compiler make it even easier to use the latest version of the CUDA toolkit."""
+++

{{abstract}}


## `CuArray` support for isbits Unions

Unions are a way to represent values of one type or another, e.g., a value that can be an
integer or a floating point. If all possible element types of a Union are so-called
bitstypes, which can be stored contiguously in memory, the Union of these types can be
stored contiguously too. This kind of optimization is implemented by the Array type, which
can store such "isbits Unions" inline, as opposed to storing a pointer to a heap-allocated
box. For more details, refer to the [Julia
documentation](https://docs.julialang.org/en/v1/devdocs/isbitsunionarrays/).

With CUDA.jl 3.3, the CuArray GPU array type now [supports this optimization
too](https://github.com/JuliaGPU/CUDA.jl/pull/941). That means you can safely allocate
CuArrays with isbits union element types and perform GPU-accelerated operations on then:

```julia-repl
julia> a = CuArray([1, nothing, 3])
3-element CuArray{Union{Nothing, Int64}, 1}:
 1
  nothing
 3

julia> findfirst(isnothing, a)
2
```

It is also safe to pass these CuArrays to a kernel and use unions there:

```julia-repl
julia> function kernel(a)
         i = threadIdx().x
         if a[i] !== nothing
           a[i] += 1
         end
         return
       end

julia> @cuda threads=3 kernel(a)

julia> a
3-element CuArray{Union{Nothing, Int64}, 1}:
 2
  nothing
 4
```

This feature is especially valuable to represent missing values, and is an important step
towards GPU support for DataFrames.jl.


## Debug and location information

Another noteworthy feature in CUDA.jl 3.3 is the [support for emitting debug and location
information](https://github.com/JuliaGPU/CUDA.jl/pull/891). The debug level, set by passing
`-g <level>` to the `julia` executable, determines how much info is emitted. The default of
level 1 only enables location information instructions which should not impact performance.
Passing `-g0` disables this, while passing `-g2` also enables the output of DWARF debug
information and compiles in debug mode.

Location information is useful for a variety of reasons. Many tools, like the NVIDIA
profilers, use it corelate instructions to source code:

{{img "nvvp.png" "NVIDIA Visual Profiler with source-code location information" }}

Debug information can be used to debug compiled code using `cuda-gdb`:

```
$ cuda-gdb --args julia -g2 examples/vadd.jl
(cuda-gdb) set cuda break_on_launch all
(cuda-gdb) run
[Switching focus to CUDA kernel 0, grid 1, block (0,0,0), thread (0,0,0), device 0, sm 0, warp 0, lane 0]
macro expansion () at .julia/packages/LLVM/hHQuD/src/interop/base.jl:74
74                  Base.llvmcall(($ir,$fn), $rettyp, $argtyp, $(args.args...))

(cuda-gdb) bt
#0  macro expansion () at .julia/packages/LLVM/hHQuD/src/interop/base.jl:74
#1  macro expansion () at .julia/dev/CUDA/src/device/intrinsics/indexing.jl:6
#2  _index () at .julia/dev/CUDA/src/device/intrinsics/indexing.jl:6
#3  blockIdx_x () at .julia/dev/CUDA/src/device/intrinsics/indexing.jl:56
#4  blockIdx () at .julia/dev/CUDA/src/device/intrinsics/indexing.jl:76
#5  julia_vadd<<<(1,1,1),(12,1,1)>>> (a=..., b=..., c=...) at .julia/dev/CUDA/examples/vadd.jl:6

(cuda-gdb) f 5
#5  julia_vadd<<<(1,1,1),(12,1,1)>>> (a=..., b=..., c=...) at .julia/dev/CUDA/examples/vadd.jl:6
6           i = (blockIdx().x-1) * blockDim().x + threadIdx().x

(cuda-gdb) l
1       using Test
2
3       using CUDA
4
5       function vadd(a, b, c)
6           i = (blockIdx().x-1) * blockDim().x + threadIdx().x
7           c[i] = a[i] + b[i]
8           return
9       end
10
```


## Improved CUDA compatibility support

As always, new CUDA.jl releases come with updated support for the CUDA toolkit. In CUDA.jl
3.1, we've [added support for CUDA 11.3](https://github.com/JuliaGPU/CUDA.jl/pull/858),
while CUDA.jl 3.3 [is compatible with CUDA 11.3 Update
1](https://github.com/JuliaGPU/CUDA.jl/pull/945). Users don't have to do anything to update
to these versions, as CUDA.jl will automatically select and download the latest supported
version.

Of course, for CUDA.jl to use the latest versions of the CUDA toolkit, a sufficiently recent
version of the NVIDIA driver is required. Before CUDA 11.0, the driver's CUDA compatibility
was a strict lower bound, and every minor CUDA release required a driver update. CUDA 11.0
comes with an enhanced compatibility option that follows semantic versioning, e.g., CUDA
11.3 can be used on an NVIDIA driver that only supports up to CUDA 11.0. CUDA.jl 3.3 now
[follows semantic versioning](https://github.com/JuliaGPU/CUDA.jl/pull/936) when selecting a
compatible toolkit, making it easier to use the latest version of the CUDA toolkit in Julia.

For those interested: Implementing semantic versioning required the CUDA.jl compiler to [use
`ptxas` instead of the driver's embedded JIT](https://github.com/JuliaGPU/CUDA.jl/pull/892)
to generate GPU machine code. At the same time, many parts of CUDA.jl still use the CUDA
driver APIs, so it's always recommended to keep your NVIDIA driver up-to-date.


## High-level graph APIs

To overcome the cost of launching kernels, CUDA makes it possible to build computational
graphs, and execute those graphs with less overhead than the underlying operations. With
CUDA.jl 3.1, we provide easy access to the APIs [to record and
execute](https://github.com/JuliaGPU/CUDA.jl/pull/877) these graphs:

```julia
A = CUDA.zeros(Int, 1)

# ensure the operation is compiled
A .+= 1

# capture
graph = capture() do
    A .+= 1
end
@test Array(A) == [1]   # didn't change anything

# instantiate and launch
exec = instantiate(graph)
CUDA.launch(exec)
@test Array(A) == [2]

# update and instantiate/launch again
graph′ = capture() do
    A .+= 2
end
update(exec, graph′)
CUDA.launch(exec)
@test Array(A) == [4]
```

This sequence of operations is common enough that we provide a high-level `@captured` macro
wraps that automatically records, updates, instantiates and launches the graph:

```julia
A = CUDA.zeros(Int, 1)

for i in 1:2
    @captured A .+= 1
end
@test Array(A) == [2]
```


## Minor changes and features

- CUDA.jl 3.1 [now supports](https://github.com/JuliaGPU/CUDA.jl/pull/842) `@atomic`
  multiplication and division (by @yuehhua)
- Several statistics functions [are
  implemented](https://github.com/JuliaGPU/CUDA.jl/pull/509) in CUDA.jl 3.1 (by @berquist)
- The device-side random number generator in CUDA.jl 3.2 [is based on
  Philox2x](https://github.com/JuliaGPU/CUDA.jl/pull/890), greatly improving quality of
  randomness (passing BigCrush) while allowing calls to `rand()` from divergent threads.
- In CUDA.jl 3.2, dependent libraries like CUDNN and CUTENSOR [are only downloaded and
  initialized](https://github.com/JuliaGPU/CUDA.jl/pull/882) when they are used.
- The `synchronize()` function in CUDA.jl 3.2 [now first
  spins](https://github.com/JuliaGPU/CUDA.jl/pull/896) before yielding and sleeping, to
  improve the latency of short-running operations.
- Several additional operations are now supported on Float16 inputs, such as [CUSPARSE and
  CUBLAS](https://github.com/JuliaGPU/CUDA.jl/pull/904) operations in CUDA.jl 3.3, and
  [various math intrinsics](https://github.com/JuliaGPU/CUDA.jl/pull/871) in CUDA.jl 3.1.
- Kepler support (compute capability 3.5) [has been
  reinstated](https://github.com/JuliaGPU/CUDA.jl/pull/923) for the time being.
