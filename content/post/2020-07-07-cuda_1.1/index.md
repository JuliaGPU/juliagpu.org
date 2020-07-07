---
tags: []
title: "CUDA.jl 1.1"
author: "Tim Besard"
---

CUDA.jl 1.1 marks the first feature release after merging several CUDA packages into one. It
raises the minimal Julia version to 1.4, and comes with support for the impending 1.5
release.

<!--more-->


## CUDA.jl replacing CuArrays/CUDAnative.jl

As [announced a while
back](https://discourse.julialang.org/t/psa-cuda-jl-replacing-cuarrays-jl-cudanative-jl-cudadrv-jl-cudaapi-jl-call-for-testing/40205),
CUDA.jl is now the new package for programming CUDA GPUs in Julia, replacing CuArrays.jl,
CUDAnative.jl, CUDAdrv.jl and CUDAapi.jl. The merged package should be a drop-in
replacement: All existing functionality has been ported, and almost all exported functions
are still there. Applications like Flux.jl or the DiffEq.jl stack are being updated to
support this change.


## CUDA 11 support

With CUDA.jl 1.1, we support the upcoming release of the CUDA toolkit. This only applies to
locally-installed versions of the toolkit, i.e., you need to specify
`JULIA_CUDA_USE_BINARYBUILDER=false` in your environment to pick up the locally-installed
release candidate of the CUDA toolkit. New features, like the third-generation tensor cores
and its extended type support, or any new APIs, are not yet natively supported by Julia
code.


## NVIDIA Management Library (NVML)

CUDA.jl now integrates with the NVIDIA Management Library, or NVML. With this library, it's
possible to query information about the system, any GPU devices, their topology, etc.:

```julia
julia> using CUDA

julia> dev = first(NVML.devices())
CUDA.NVML.Device(Ptr{Nothing} @0x00007f987c7c6e38)

julia> NVML.uuid(dev)
UUID("b8d5e790-ea4d-f962-e0c3-0448f69f2e23")

julia> NVML.name(dev)
"Quadro RTX 5000"

julia> NVML.power_usage(dev)
37.863

julia> NVML.energy_consumption(dev)
65330.292
```


## Experimental: Texture support

It is now also possible to use the GPU's hardware texture support from Julia, albeit using a
fairly low-level and still experimental API (many thanks to
[@cdsousa](https://github.com/cdsousa) for the initial development). As a demo, let's start
with loading a sample image:

```julia
julia> using Images, TestImages, ColorTypes, FixedPointNumbers
julia> img = RGBA{N0f8}.(testimage("lighthouse"))
```

We use RGBA since CUDA's texture hardware only supports 1, 2 or 4 channels. This support is
also currently limited to "plain" types, so let's reinterpret the image:

```julia
julia> img′ = reinterpret(NTuple{4,UInt8}, img)
```

Now we can upload this image to the array, using the `CuTextureArray` type for optimized
storage (normal `CuArray`s are supported too), and bind it to a `CuTexture` object that we
can pass to a kernel:

```julia
julia> texturearray = CuTextureArray(img′)

julia> texture = CuTexture(texturearray; normalized_coordinates=true)
512×768 4-channel CuTexture(::CuTextureArray) with eltype NTuple{4,UInt8}
```

Let's write and a kernel that warps this image. Since we specified
`normalized_coordinates=true`, we index the texture using values in `[0,1]`:

```julia
function warp(dst, texture)
    tid = threadIdx().x + (blockIdx().x - 1) * blockDim().x
    I = CartesianIndices(dst)
    @inbounds if tid <= length(I)
        i,j = Tuple(I[tid])
        u = Float32(i-1) / Float32(size(dst, 1)-1)
        v = Float32(j-1) / Float32(size(dst, 2)-1)
        x = u + 0.02f0 * CUDA.sin(30v)
        y = v + 0.03f0 * CUDA.sin(20u)
        dst[i,j] = texture[x,y]
    end
    return
end
```

The size of the output image determines how many elements we need to process. This needs to
be translated to a number of threads and blocks, keeping in mind device and kernel
characteristics. We automate this using the occupancy API:

```julia
julia> outimg_d = CuArray{eltype(img′)}(undef, 500, 1000);

julia> function configurator(kernel)
           config = launch_configuration(kernel.fun)

           threads = Base.min(length(outimg_d), config.threads)
           blocks = cld(length(outimg_d), threads)

           return (threads=threads, blocks=blocks)
       end

julia> @cuda config=configurator warp(outimg_d, texture)
```

Finally, we fetch and visualize the output:

```julia
julia> outimg = Array(outimg_d)

julia> save("imgwarp.png", reinterpret(eltype(img), outimg))
```

{{< img "imgwarp.png" "Warped lighthouse" >}}


## Minor features

The test-suite is now parallelized, using up-to `JULIA_NUM_THREADS` processes:

```
$ JULIA_NUM_THREADS=4 julia -e 'using Pkg; Pkg.test("CUDA");'

                                     |          | ---------------- GPU ---------------- | ---------------- CPU ---------------- |
Test                        (Worker) | Time (s) | GC (s) | GC % | Alloc (MB) | RSS (MB) | GC (s) | GC % | Alloc (MB) | RSS (MB) |
initialization                   (2) |     2.52 |   0.00 |  0.0 |       0.00 |   115.00 |   0.05 |  1.8 |     153.13 |   546.27 |
apiutils                         (4) |     0.55 |   0.00 |  0.0 |       0.00 |   115.00 |   0.02 |  4.0 |      75.86 |   522.36 |
codegen                          (4) |    14.81 |   0.36 |  2.5 |       0.00 |   157.00 |   0.62 |  4.2 |    1592.28 |   675.15 |
...
gpuarrays/mapreduce essentials   (2) |   113.52 |   0.01 |  0.0 |       3.19 |   641.00 |   2.61 |  2.3 |    8232.84 |  2449.35 |
gpuarrays/mapreduce (old tests)  (5) |   138.35 |   0.01 |  0.0 |     130.20 |   507.00 |   2.94 |  2.1 |    8615.15 |  2353.62 |
gpuarrays/mapreduce derivatives  (3) |   180.52 |   0.01 |  0.0 |       3.06 |   229.00 |   3.44 |  1.9 |   12262.67 |  1403.39 |

Test Summary: |  Pass  Broken  Total
  Overall     | 11213       3  11216
    SUCCESS
    Testing CUDA tests passed
```

A copy of `Base.versioninfo()` is available to report on the CUDA toolchain and any devices:

```
julia> CUDA.versioninfo()
CUDA toolkit 10.2.89, artifact installation
CUDA driver 11.0.0
NVIDIA driver 450.36.6

Libraries:
- CUBLAS: 10.2.2
- CURAND: 10.1.2
- CUFFT: 10.1.2
- CUSOLVER: 10.3.0
- CUSPARSE: 10.3.1
- CUPTI: 12.0.0
- NVML: 11.0.0+450.36.6
- CUDNN: 7.6.5 (for CUDA 10.2.0)
- CUTENSOR: 1.1.0 (for CUDA 10.2.0)

Toolchain:
- Julia: 1.5.0-rc1.0
- LLVM: 9.0.1
- PTX ISA support: 3.2, 4.0, 4.1, 4.2, 4.3, 5.0, 6.0, 6.1, 6.3, 6.4
- Device support: sm_35, sm_37, sm_50, sm_52, sm_53, sm_60, sm_61, sm_62, sm_70, sm_72, sm_75

1 device(s):
- Quadro RTX 5000 (sm_75, 14.479 GiB / 15.744 GiB available)
```

CUTENSOR artifacts have been upgraded to version 1.1.0.

Benchmarking infrastructure based on the Codespeed project has been set-up at
[speed.juliagpu.org](https://speed.juliagpu.org/) to keep track of the performance of
various operations.
