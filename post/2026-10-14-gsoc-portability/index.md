+++
title = "GSoC 2026: Portable data-parallel primitives for the Julia GPU stack"
author = "Shreyas Hegde"
abstract = """
  This Google Summer of Code 2026 project added the data-parallel primitives that
  the Julia GPU stack was missing and tuned them to serve as the shared
  implementation for every backend. The work was merged as 15 pull requests in
  AcceleratedKernels.jl 0.5. Each operation is benchmarked on an NVIDIA RTX 5080 against
  the pre-GSoC AK release and the CUDA.jl vendor path, showing real speedups where a
  better algorithm applies, new functionality where AK had nothing before, and parity
  on the bandwidth-bound operations."""
+++

{{abstract}}

This post is my Google Summer of Code 2026 final report for [The Julia
Language](https://julialang.org/) (JuliaGPU), mentored by Tim Besard and Christian
Guinard. It covers the project goals, what I did, what was merged, the benchmark
results for each operation, and what is left.

## The problem

The Julia GPU ecosystem lets users write array programs that run on NVIDIA, AMD, and
Intel GPUs. That portability relies on GPUArrays.jl, which defines the common
interface every vendor package implements. Several common operations did not have a
shared implementation. `reverse`, `findall`, `accumulate!`, and `mapreduce` either
failed on backends with no vendor-specific method, or fell back to CPU execution by
copying data to the host and back. A source review of GPUArrays.jl, CUDA.jl,
AMDGPU.jl, oneAPI.jl, and Metal.jl confirmed the gaps: `reverse` and `findall`
were missing from the shared fallback, `accumulate!` existed only as a scalar CPU
fallback, and `mapreducedim!` was an `error("Not implemented")` stub, so each backend
carried its own copy.

The project addresses these gaps by moving the kernels into
[AcceleratedKernels.jl](https://github.com/JuliaGPU/AcceleratedKernels.jl) (AK),
which is written once against KernelAbstractions.jl and runs on every backend, and
by keeping GPUArrays.jl as a thin layer that delegates to it. Because Julia's
multiple dispatch selects the most specific method, routing the `AnyGPUArray` fallback
to AK means a backend that already has a vendor method keeps it, while a backend
without one receives the AK implementation instead of an error or a host round trip.

## Project goals

The goals I set with my mentors were:

- Add the missing data-parallel primitives (`reverse`, `findall`, `accumulate`,
  `mapreduce`, and the `sort` family) as portable AK kernels, so GPUArrays.jl can
  use one implementation instead of each backend maintaining its own.
- Add dimension-wise (`dims`) support across these operations, since array code
  reduces, scans, reverses, and sorts along an axis, not only over a flat vector.
- Tune the kernels so the portable path is at least as fast as the vendor and `Base`
  implementations, and add further sort algorithms where one strategy does not fit
  every input shape.
- Run a benchmark across every operation to check for regressions and to find where
  tuning is still required.

## What I did

I merged the work as 15 pull requests, released in AcceleratedKernels.jl 0.5. AK 0.5
also reworked the host API (algorithms passed as values, an `Auto()` selector that
chooses a strategy per input, and explicit workspaces), so every operation now has one
calling convention across backends.

**Primitives and `dims` support.** I gave reductions and scans N-dimensional axis
handling, added `reverse` and then extended it to arbitrary `dims`, built `findall` as
a scan-based stream compaction, and generalized `map` and `map!` to take several source
arrays.

**Sorting.** A single comparison sort is not the best choice for every shape, since it
is good on short slices but grows as `L log L` on long ones. I added an opt-in LSD
`RadixSort` and tuned it with portable, capability-gated changes (a larger block size,
atomic histograms, chunked scatter), added a `BitonicSort` network for short slices,
and added a segmented `RadixSort` path for sorting along `dims` whose cost depends
little on slice length. The `Auto()` selector chooses between them per input.

**Benchmarking.** I measured each operation on the same data on an NVIDIA RTX 5080,
timing on the device with `CUDA.@elapsed` and taking the minimum of 12 warmed runs. For
mutating operations I refreshed the input each iteration. Every run used AK's default
settings with no per-device tuning. I compare each operation against the state of
AcceleratedKernels before the project and against the CUDA.jl vendor path. The "before"
numbers come from checking out AK at the exact commit just before this work began
(`bfe4d84`, the v0.4.3 line) and profiling it on the same machine. The results per
operation follow.

## Results by operation

In every chart, lower time is better, and both axes use a logarithmic scale unless
noted. The series are:

- **Before GSoC (AK v0.4.3):** the state of AcceleratedKernels before this work. For
  the operations AK already had (`sort`, `sortperm`, `reduce`, `accumulate`, `map`, and
  reduction along `dims`), this is the pre-GSoC AK kernel. For `reverse` and `findall`,
  AK had no kernel at all before this project, so there is no pre-GSoC AK line and the
  before-state is the CUDA.jl path shown instead.
- **CUDA.jl:** the vendor GPU implementation that already shipped, reached by calling
  the standard function on a `CuArray` (through CUDA.jl and GPUArrays.jl).
- **AK (this work):** the current AcceleratedKernels.jl kernel.

One thing to set out up front: pre-GSoC AK was already a capable library. For some
operations the result is a clear speedup, for others it is functionality that did not
exist before, and for the bandwidth-bound operations it is parity with no regression. I
call out each case below.

### Sort

Pre-GSoC AK already had a `MergeSort` that was well ahead of the CUDA.jl sort (about 6
to 7 times faster at large sizes). The contribution here is the new `RadixSort`, which
is about twice as fast as the old `MergeSort` on large integer arrays (at 128M `Int32`,
83 ms for `MergeSort` versus 39 ms for `RadixSort`), plus a `BitonicSort` for short
slices and the `Auto` selector. `Auto` currently tracks the merge path at these `Int32`
sizes, so `RadixSort` is the fast option to pick explicitly.

{{img "sort.png" "Flat Int32 sort time versus array size: pre-GSoC MergeSort, CUDA.jl, AK Auto, and AK RadixSort"}}

### sortperm

`sortperm` is faster than pre-GSoC AK by about 1.5 times at large sizes (191 ms to 125
ms at 128M `Int32`), and both are far ahead of the CUDA.jl `sortperm`, which is slow on
the GPU.

{{img "sortperm.png" "Flat Int32 sortperm time versus array size: pre-GSoC AK, CUDA.jl, and AK"}}

### accumulate

The scan rework is a clear win. The `Float32` cumulative sum is about 2 to 3 times
faster than pre-GSoC AK (7.6 ms to 2.7 ms at 128M), and faster than the CUDA.jl scan
across sizes.

{{img "accumulate.png" "Float32 cumsum time versus array size: pre-GSoC AK, CUDA.jl, and AK"}}

### reduce and mapreduce

A whole-array reduction reads the input a fixed number of times, so it is limited by
memory bandwidth. It was already at that limit in pre-GSoC AK, so the result is parity:
the three lines sit together, with a slight mid-size dip in the current version that is
tracked in [#135](https://github.com/JuliaGPU/AcceleratedKernels.jl/issues/135).

{{img "reduce.png" "Whole-array Float32 reduce time versus array size: pre-GSoC AK, CUDA.jl, and AK"}}

Reduction along a dimension is close to the pre-GSoC path per shape; PR #83 mainly
widened which dimensions and shapes are handled rather than changing the per-shape time,
and the result stays ahead of the CUDA.jl `dims` reduction on most shapes.

{{img "mapreduce_dims.png" "mapreduce along dims=2 time by array shape: pre-GSoC AK, CUDA.jl, and AK"}}

### findall

`findall` did not exist in AK before this project; it was added as a scan-based stream
compaction. The chart compares it against the CUDA.jl `findall` you would have used
instead, which it matches or slightly beats across densities.

{{img "findall.png" "findall time versus array size at density 0.5: CUDA.jl (before) and AK"}}

### reverse

`reverse` was also new to AK. It is bandwidth-limited, so it sits at parity with the
CUDA.jl `reverse!` that was the only option before.

{{img "reverse.png" "Flat Int32 reverse time versus array size: CUDA.jl (before) and AK"}}

### map

Single-source `map` is bandwidth-limited and sits at parity with pre-GSoC AK and the
CUDA.jl `map!`. The new capability here is multi-source `map` and `map!`, which did not
exist before.

{{img "map.png" "Float32 map time versus array size: pre-GSoC AK, CUDA.jl, and AK"}}

Taken together: a real speedup where a better algorithm applies (`RadixSort`, the
faster scan behind `accumulate`, and `sortperm`), new functionality
where AK had nothing before (`findall`, `reverse`, `BitonicSort`, sorting and reducing
along `dims`, multi-source `map`), and parity with no regression on the bandwidth-bound
operations (`reduce`, `map`), which already ran at the memory limit.

## What got merged upstream

All of the primitive work is merged and released in AcceleratedKernels.jl 0.5; the
one AMDGPU.jl fix is merged there.

| PR | What it does |
|:---|:-------------|
| [#83](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/83) | Dimensional `mapreduce` / `reduce` |
| [#90](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/90) | Opt-in `RadixSort` via `alg` |
| [#97](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/97) | Optimize radix sort |
| [#102](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/102) | `reverse!` / `reverse` |
| [#105](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/105) | Vectorized by-block reduce loads |
| [#107](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/107) | `items_per_thread` for reductions |
| [#108](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/108) | `items_per_thread` for scans |
| [#114](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/114) | `dims` for `reverse` |
| [#115](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/115) | `findall` (stream compaction) |
| [#116](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/116) | Device-scope fence for DecoupledLookback |
| [#117](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/117) | `dims` for `sort` / `sortperm` |
| [#126](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/126) | `BitonicSort` |
| [#129](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/129) | Segmented `RadixSort` along `dims` |
| [#130](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/130) | Multi-source `map` / `map!` |
| [AMDGPU.jl #1069](https://github.com/JuliaGPU/AMDGPU.jl/pull/1069) | Guard empty-array `reverse` launch |

Two measurement write-ups are recorded as open issues so the data lives in the repo:
`Int32` indexing in [#149](https://github.com/JuliaGPU/AcceleratedKernels.jl/issues/149)
and device-aware tuning in [#150](https://github.com/JuliaGPU/AcceleratedKernels.jl/issues/150).
The GPUArrays.jl delegation that consumes this work has merged as
[#790](https://github.com/JuliaGPU/GPUArrays.jl/pull/790); it is maintained by Tim and
builds on the AK 0.5 host-API rework, which also merged and shipped in 0.5.

## Current state

Measured against the stated goals:

- **Missing primitives as portable AK kernels:** done and merged. `reverse`,
  `findall`, `accumulate`, `mapreduce` or `reduce`, and the `sort` and `sortperm`
  family are in AK 0.5 and run on every backend.
- **`dims` support:** done. Reductions, scans, `reverse`, and `sort` take `dims`.
- **Performance at least at parity:** done, as the per-operation charts show.
- **Regression check:** done, through the full benchmark run.

The GPUArrays.jl delegation merged in
[#790](https://github.com/JuliaGPU/GPUArrays.jl/pull/790), which builds on the AK 0.5
host-API rework. A backend without a vendor method now uses the AK implementation.

## Challenges and lessons learned

**A single-pass scan needs a real device-scope fence.** The decoupled-lookback scan
that makes `accumulate` fast is a single pass in which blocks read each other's partial
results, so it is correct only if every backend provides a device-scope memory fence
between the write and the read. The first version passed on one backend and produced
wrong results on another. The fix
([#116](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/116)) added a real
device-scope fence on every backend. A memory-ordering assumption that holds on one
vendor is not portable until it is checked on each.

**GPU predicates have to stay type-stable.** Building `findall` as a stream compaction
([#115](https://github.com/JuliaGPU/AcceleratedKernels.jl/pull/115)) failed to compile
whenever the predicate closure captured a `Type` or returned a type-unstable value. I
had to write the kernels so the predicate stays type-stable. GPU code is less forgiving
than CPU code here, and the fix came down to being careful about what a device closure
captures.

**Edge cases show up only on real hardware.** The out-of-place `reverse` failed when
launched on an empty array, but only on AMD, and only when the tests ran on actual AMD
hardware ([AMDGPU.jl #1069](https://github.com/JuliaGPU/AMDGPU.jl/pull/1069)).
Portability work needs to run on each backend.

**Measure before adding complexity.** Two changes that looked promising, a `shfl_down`
subgroup reduction and `Int32` index arithmetic, gave no improvement once measured,
because both operations are limited by memory bandwidth rather than by the part being
changed. Measuring them early kept that complexity out of the code. A recorded negative
result is as useful as a positive one.

The main lesson is that portability and performance are compatible once the algorithm
fits the operation. The compute-bound operations improve because one portable kernel can
use a work-efficient algorithm that each backend would otherwise reimplement, and the
bandwidth-bound operations reach parity, which is the expected ceiling.

## What is left

- **Device-aware `Auto` tuning.** The per-backend override belongs in a package
  extension through the `reduce_tuning` and `sort_tuning` hooks. Now that the AK
  host-API rework has landed, this can be added without a full autotuner. Data in
  [#150](https://github.com/JuliaGPU/AcceleratedKernels.jl/issues/150).
- **Narrow-integer (`Int32`) indexing.** This is being handled at the GPU compiler
  level (by Tim) by adding `llvm.assume` range hints so the compiler narrows `i64` to
  `i32` with no source changes. In a memory-bound regime the effect is small.
  Measurements in [#149](https://github.com/JuliaGPU/AcceleratedKernels.jl/issues/149).
- **Small and whole-array reductions.** A known slowdown is tracked in
  [#135](https://github.com/JuliaGPU/AcceleratedKernels.jl/issues/135), which I am
  looking into.
- **GPUArrays on top of AK.** The larger plan is to build GPUArrays.jl on top of AK
  so backends no longer depend on it directly. The first delegation PR
  [#790](https://github.com/JuliaGPU/GPUArrays.jl/pull/790) has merged, and more
  operations can follow the same path.

Thanks to Tim Besard and Christian Guinard for their mentorship, and to the JuliaGPU
community.
