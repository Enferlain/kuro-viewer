use std::path::PathBuf;

fn print_usage() {
    eprintln!(
        "usage: workspace_plugin_packager <workspace-plugin-dir> <output-archive.plugin> [build-overlay-dir]"
    );
}

fn main() {
    let mut args = std::env::args().skip(1);
    let Some(plugin_dir) = args.next() else {
        print_usage();
        std::process::exit(1);
    };
    let Some(archive_path) = args.next() else {
        print_usage();
        std::process::exit(1);
    };
    let overlay_root = args.next().map(PathBuf::from);

    if args.next().is_some() {
        print_usage();
        std::process::exit(1);
    }

    let result = app_lib::workspace_packaging::package_workspace_plugin_dir(
        &PathBuf::from(plugin_dir),
        &PathBuf::from(archive_path),
        overlay_root.as_deref(),
    );

    match result {
        Ok(result) => {
            eprintln!(
                "packaged {} entries into {}",
                result.included_entries.len(),
                result.archive_path.display()
            );
        }
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}
