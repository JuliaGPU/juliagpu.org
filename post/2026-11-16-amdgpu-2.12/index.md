+++
title = "AMDGPU.jl 2.8–2.12: ROCm as artifacts, a performance dashboard, and a faster core"
author = "Ludovic Räss"
abstract = """
  With AMDGPU.jl 2.12, ROCm is downloaded as an artifact and no longer needs to be installed. Recent releases also bring a public performance dashboard, faster kernel launches and reductions, hipTensor wrappers, device-side BLAS scalars, and better support for GPU-aware MPI."""
+++

{{abstract}}

## ROCm as artifacts

Until now, [AMDGPU.jl](https://github.com/JuliaGPU/AMDGPU.jl) needed a ROCm installation on the system. Starting with 2.12, the ROCm runtime and libraries (rocBLAS, rocSOLVER, rocSPARSE, rocFFT, rocRAND, MIOpen and hipTensor) are downloaded as artifacts, taken from AMD's [TheRock](https://github.com/ROCm/TheRock) distribution ([#1028](https://github.com/JuliaGPU/AMDGPU.jl/pull/1028)). Only the GPU driver has to be installed:

```julia-repl
pkg> add AMDGPU

julia> using AMDGPU

julia> AMDGPU.versioninfo()
```

The bundle is selected from the GPU architecture detected on the host. Bundles based on ROCm 10.1 are available for many Radeon GPUs and APUs, such as the RDNA3 series, and for Instinct accelerators, such as the MI250 and MI300. A local ROCm installation (6.0 or later) can still be used:

```julia
AMDGPU.set_rocm_version!(local_rocm=true)   # takes effect after restarting Julia
```

Windows bundles exist for most architectures, but have seen little testing so far. If you use AMDGPU.jl on Windows, please try them and [report](https://github.com/JuliaGPU/AMDGPU.jl/issues) what you find. The [installation guide](https://amdgpu.juliagpu.org/stable/install_tips) lists the available bundles, and explains how to select one on a machine without a GPU.

## Performance dashboard

AMDGPU.jl benchmarks run on every commit to the main branch, on a Radeon RX 7900 XTX. Since 2.11, the results are published to the [JuliaGPU performance dashboard](https://juliagpu.org/perf/?pkg=amdgpu) ([#1193](https://github.com/JuliaGPU/AMDGPU.jl/pull/1193)). The dashboard is shared with CUDA.jl, Metal.jl and KernelAbstractions.jl. It shows the history of each benchmark, and highlights changes that are larger than the usual run-to-run noise.

The benchmarks are grouped in three categories: performance (array operations, kernels, launches), latency (precompilation, import, first kernel), and applications. The last group is new, with a tiled matrix multiplication, a 3D diffusion stencil and other small workloads ([#1061](https://github.com/JuliaGPU/AMDGPU.jl/pull/1061)). Pull requests now receive a comment that compares their benchmarks with the main branch ([#1194](https://github.com/JuliaGPU/AMDGPU.jl/pull/1194)), so regressions are visible before merging.

## A faster core

Several changes reduce the cost of launching kernels:

- launching a kernel allocates once instead of 12 times ([#1009](https://github.com/JuliaGPU/AMDGPU.jl/pull/1009), already in 2.7.1), and kernel lookups are cached ([#1189](https://github.com/JuliaGPU/AMDGPU.jl/pull/1189)). The launch benchmark went from about 1.3 µs at 2.7 to about 0.9 µs;
- kernels read their grid dimensions from hidden kernel arguments, which makes short kernels about twice as fast ([#1058](https://github.com/JuliaGPU/AMDGPU.jl/pull/1058));
- KernelAbstractions launches, including the ones behind broadcasting, no longer go through dynamic dispatch ([#1115](https://github.com/JuliaGPU/AMDGPU.jl/pull/1115)).

Reductions, scans and sorting now use the shared implementations of GPUArrays 12 ([#1145](https://github.com/JuliaGPU/AMDGPU.jl/pull/1145)). The largest gains on our benchmark machine are for a large matrix: `reduce` and `mapreduce` along the first dimension are about 12 times faster, and `accumulate` along the second dimension about 20 times. Not every case improved at first: the two `accumulate` benchmarks on vectors were 10–30% slower after the switch, but are back within a few percent of their earlier times in 2.12. The figure below shows the history of the `reduce` benchmark on the dashboard.

{{img "perf_reduce.png" "The JuliaGPU performance dashboard, showing the history of the AMDGPU.jl benchmark of reduce along the first dimension of a large matrix"}}

The red entry in the list of groups is synchronization: `AMDGPU.device_synchronize()` now waits on a worker thread instead of blocking the calling one ([#1118](https://github.com/JuliaGPU/AMDGPU.jl/pull/1118)), which costs about 1 µs more on an idle device.

## Linear algebra and tensors

Version 2.8 adds wrappers for [hipTensor](https://rocm.docs.amd.com/projects/hipTensor/en/latest/index.html), AMD's tensor contraction library ([#890](https://github.com/JuliaGPU/AMDGPU.jl/pull/890)). hipTensor is not available on every GPU: the artifacts include it for the MI-series bundles only. The [documentation](https://amdgpu.juliagpu.org/stable/libraries/tensor) lists the current limitations.

Version 2.12 adds device-side scalars for rocBLAS ([#1213](https://github.com/JuliaGPU/AMDGPU.jl/pull/1213)). A scalar such as the result of `dot` can stay on the GPU and be passed to the next call, without waiting for the host:

```julia
x, y = AMDGPU.rand(Float32, 1024), AMDGPU.rand(Float32, 1024)

d = ROCRef{Float32}()
AMDGPU.rocBLAS.dot(length(x), x, 1, y, 1, d)   # d = x ⋅ y, without synchronizing
AMDGPU.rocBLAS.scal!(length(x), d, x, 1)       # x .*= d
d[]                                            # copy to the host
```

The same release adds a blocked QR factorization ([#1214](https://github.com/JuliaGPU/AMDGPU.jl/pull/1214)) and accepts strided views in more rocBLAS wrappers ([#1218](https://github.com/JuliaGPU/AMDGPU.jl/pull/1218)).

**The default SVD algorithm changed.** The [previous post](https://juliagpu.org/post/2026-07-06-amdgpu-2.7/) announced the Jacobi method as the default, because it is faster. It turned out that rocSOLVER's Jacobi SVD loses the small singular values (below `sqrt(eps)·σ₁`) without reporting an error, so `svd`, `cond` or `rank` could be less accurate than expected. Since 2.12, `svd` and `svdvals` use QR iteration by default, which matches LAPACK ([#1221](https://github.com/JuliaGPU/AMDGPU.jl/pull/1221)). The Jacobi method remains available for well-conditioned matrices:

```julia
F = svd(A)                            # QR iteration, accurate
F = svd(A; alg = JacobiAlgorithm())   # faster, for well-conditioned matrices
```

The SVD and eigenvalue wrappers of rocSOLVER now also report failures, as LAPACK does on the CPU ([#1220](https://github.com/JuliaGPU/AMDGPU.jl/pull/1220)).

## Streams, tasks and MPI

GPU-aware MPI did not work with `ROCArray`s on ROCm 7.1 and later, because the memory of the default pool could not be shared between processes. Since 2.11, memory pools on Linux are created so that their memory can be exported ([#1208](https://github.com/JuliaGPU/AMDGPU.jl/pull/1208)).

AMDGPU.jl waits for pending work on an array when the array is used on another stream. This is safe, but prevents kernels on different streams from working on the same array at the same time, for example to exchange halos while the interior is computed. This can now be disabled per array ([#1209](https://github.com/JuliaGPU/AMDGPU.jl/pull/1209)):

```julia
s1, s2 = HIPStream(), HIPStream()
AMDGPU.enable_synchronization!(A, false)
@roc stream=s1 interior!(A)
@roc stream=s2 boundary!(A)   # runs concurrently
AMDGPU.synchronize(s1); AMDGPU.synchronize(s2)
AMDGPU.enable_synchronization!(A)
```

Applications that spawn many short tasks also benefit from 2.9: the stream of a finished task is now reused by the next task, instead of staying alive until garbage collection ([#1120](https://github.com/JuliaGPU/AMDGPU.jl/pull/1120)).

Most of these changes come from the recent releases, up to 2.12. As always, update to the latest version to pick them up, and see the [changelog](https://github.com/JuliaGPU/AMDGPU.jl/releases) for the full list. AMDGPU.jl is a community effort, and contributions, issue reports and feedback are welcome. Thanks to Tim Besard, Katharine Hyatt, Simeon David Schaub, Gabriel Baraldi, Christian Guinard, Gregor Decristoforo, Anton Smirnov, Dohyeon Lee, Ka Wai Ho, Shreyas Hegde, Phil Tomson, Michel Schanen, Mateusz Kubica, John Eismeier, Alex Ames and Valentin Churavy for their contributions to these releases.
