using Dates

function hfun_youtube(params)
    id = params[1]
    return """
        <div style=position:relative;padding-bottom:56.25%;height:0;overflow:hidden>
          <iframe
            src=https://www.youtube.com/embed/$id
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"
            allowfullscreen
            title="YouTube Video">
          </iframe>
        </div>
        """
end

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul",
               "Aug", "Sep", "Oct", "Nov", "Dec"]

function blogpost_name(fp)
    lag = ifelse(endswith(fp, "index.md"), 1, 0)
    return splitpath(fp)[end-lag]
end

function getdate(fname)
    y, m, d, _ = split(fname, "-")
    return parse.(Int, (y, m, d))
end

function hfun_redirect(params)
    url = params[1]
    # NOTE: we don't do a <meta> or <script> redirect, because that would
    #       end up in the RSS feed which some sites pick up verbatim.
    return """<p>This post is located at <a href="$url">$url</a></p>"""
end

function hfun_post_date()
    # capture the RSS publication date from the file name
    fd_url = locvar(:fd_url)::String
    d = Date(match(r"(20\d\d-\d\d-\d\d)", fd_url).captures[1])
    Franklin.set_var!(Franklin.LOCAL_VARS, "rss_pubdate", d)

    fname = blogpost_name(locvar(:fd_rpath)::String)
    y, m, d = getdate(fname)
    author = locvar(:author)
    author_line = ""
    if !isnothing(author)
        author_line = """
            <i data-feather=edit-2></i>
            $author
            """
    end
    return """
           <i data-feather=calendar></i>
           <time datetime=$y-$m-$d>$(MONTH[m]) $d, $y</time><br>
           $author_line
           """
end

function blogpost_entry_html(link, title, y, m, d; ext=false)
    return """
        <p>
          <a class=font-125 href="$link">
            $title
          </a>$(ifelse(ext, "<span>&nbsp;&#8599;</span>", ""))
          <br>
          <i data-feather=calendar></i>
          <time datetime=$y-$m-$d>$(MONTH[m]) $d, $y</time><br>
        </p>
        """
end

function blogpost_entry(fpath)
    rpath = joinpath("post", fpath)
    if isdir(rpath)
        rpath = joinpath(rpath, "index.md")
    end
    hidden = pagevar(rpath, :hidden)
    if hidden === true
        return nothing
    end
    ext = something(pagevar(rpath, :external), false)
    title = pagevar(rpath, :title)::String
    y, m, d = getdate(fpath)
    rpath = replace(fpath, r"\.md$" => "")
    date = Date(y, m, d)
    return (date, blogpost_entry_html("/post/$rpath/", title, y, m, d; ext))
end

function blogpost_external_entries()
    return [(d, blogpost_entry_html(l, t, year(d), month(d), day(d); ext=true))
            for (d, t, l) in locvar(:external_entries)]
end

function hfun_blogposts()
    io = IOBuffer()
    elements = filter(readdir("post")) do entry
        entry in ("index.md", ".DS_Store") && return false
        return true
    end
    entries = [blogpost_entry(fp) for fp in elements]
    entries = [e for e in entries if !isnothing(e)]
    append!(entries, blogpost_external_entries())
    sort!(entries, by=(e -> e[1]), rev=true)
    for entry in entries
        write(io, entry[2])
    end
    return String(take!(io))
end

function hfun_img(params)
    img = params[1]
    cap = params[2]
    path = replace(locvar(:fd_url), "/index.html" => "/")
    return """
        <figure>
          <img src="$(path)$img" alt="$cap">
        </figure>
        """
end

function hfun_abstract()
    abstract = locvar(:abstract)::String
    descr = fd2html(abstract; internal=true, nop=true)
    Franklin.set_var!(Franklin.LOCAL_VARS, "rss_description", descr)
    return "<p>$descr</p>"
end

function hfun_postredirect()
    fd_url = locvar(:fd_url)::String
    path = replace(fd_url, "/post/" => "/")
    return Franklin.hfun_redirect([path])
end

function hfun_rss_guid()
    rss_guid = locvar("guid")
    if rss_guid !== nothing
        return rss_guid::String
    else
        # Hugo-style GUID without `/post/` or `index.html`
        return replace(replace(locvar(:fd_full_url), r"index.html$" => ""), "/post/" => "/")
    end
end
