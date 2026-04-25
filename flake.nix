{
  description = "themehub — community theme hub for OS, bootloader, Ventoy, and more.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    let
      perSystem = flake-utils.lib.eachDefaultSystem (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          rustToolchain = pkgs.rustPlatform;

          themehubCli = rustToolchain.buildRustPackage {
            pname = "themehub";
            version = "0.1.0";
            src = ./cli;
            cargoLock.lockFile = ./cli/Cargo.lock;
            nativeBuildInputs = [ pkgs.pkg-config ];
            buildInputs = with pkgs; [ openssl ] ++ pkgs.lib.optional pkgs.stdenv.isDarwin pkgs.libiconv;
            meta = with pkgs.lib; {
              description = "Command-line client for themehub instances";
              homepage = "https://github.com/CDotNightHawk/themehub";
              license = licenses.mit;
              mainProgram = "themehub";
            };
          };

          devShell = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_22
              postgresql_16
              cargo
              rustc
              rust-analyzer
              minio-client
              jq
              openssl
              pkg-config
            ];
            shellHook = ''
              export PGDATA=$PWD/.pgdata
              export DATABASE_URL="postgres://themehub:themehub@localhost:5432/themehub"
              echo "themehub dev shell. Web: cd web && npm run dev. CLI: cd cli && cargo run -- search ventoy"
            '';
          };
        in
        {
          packages = {
            cli = themehubCli;
            default = themehubCli;
          };

          apps.cli = {
            type = "app";
            program = "${themehubCli}/bin/themehub";
          };

          devShells.default = devShell;
        }
      );
    in
    perSystem
    // {
      nixosModules.default = import ./nix/module.nix { inherit self; };
    };
}
