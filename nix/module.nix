{ self }:
{ config, lib, pkgs, ... }:

let
  cfg = config.services.themehub;
  themehubSrc = "${self}/web";
in
{
  options.services.themehub = {
    enable = lib.mkEnableOption "themehub web server";

    domain = lib.mkOption {
      type = lib.types.str;
      example = "themes.example.com";
      description = "Public domain the site is reachable at (without scheme).";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Port the Next.js server listens on.";
    };

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.nodejs_22;
      description = "Node.js used to run the server.";
    };

    user = lib.mkOption {
      type = lib.types.str;
      default = "themehub";
    };

    group = lib.mkOption {
      type = lib.types.str;
      default = "themehub";
    };

    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/themehub";
      description = "Directory used for local file storage when STORAGE_DRIVER=local.";
    };

    secretsFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = ''
        Path to an EnvironmentFile-format file containing AUTH_SECRET and any
        OAuth credentials. Highly recommended in production.
      '';
    };

    adminUsers = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ ];
      description = "Emails granted admin powers on first login.";
    };

    storage = lib.mkOption {
      type = lib.types.enum [ "local" "s3" ];
      default = "local";
    };

    s3 = lib.mkOption {
      type = lib.types.submodule {
        options = {
          endpoint = lib.mkOption { type = lib.types.str; default = ""; };
          region = lib.mkOption { type = lib.types.str; default = "us-east-1"; };
          bucket = lib.mkOption { type = lib.types.str; default = "themehub"; };
          forcePathStyle = lib.mkOption { type = lib.types.bool; default = true; };
        };
      };
      default = { };
    };
  };

  config = lib.mkIf cfg.enable {
    users.users.${cfg.user} = {
      isSystemUser = true;
      group = cfg.group;
      home = cfg.dataDir;
      createHome = true;
    };
    users.groups.${cfg.group} = { };

    services.postgresql = {
      enable = true;
      ensureDatabases = [ "themehub" ];
      ensureUsers = [
        {
          name = cfg.user;
          ensureDBOwnership = true;
        }
      ];
    };

    systemd.services.themehub = {
      description = "themehub web server";
      after = [ "network.target" "postgresql.service" ];
      wants = [ "postgresql.service" ];
      wantedBy = [ "multi-user.target" ];

      environment = {
        NODE_ENV = "production";
        PORT = toString cfg.port;
        AUTH_URL = "https://${cfg.domain}";
        PUBLIC_URL = "https://${cfg.domain}";
        DATABASE_URL = "postgres:///themehub?host=/run/postgresql";
        STORAGE_DRIVER = cfg.storage;
        STORAGE_LOCAL_DIR = "${cfg.dataDir}/storage";
        ADMIN_USERS = lib.concatStringsSep "," cfg.adminUsers;
        S3_ENDPOINT = cfg.s3.endpoint;
        S3_REGION = cfg.s3.region;
        S3_BUCKET = cfg.s3.bucket;
        S3_FORCE_PATH_STYLE = if cfg.s3.forcePathStyle then "true" else "false";
      };

      serviceConfig = {
        Type = "simple";
        User = cfg.user;
        Group = cfg.group;
        WorkingDirectory = themehubSrc;
        EnvironmentFile = lib.mkIf (cfg.secretsFile != null) cfg.secretsFile;
        StateDirectory = "themehub";
        ExecStartPre = "${cfg.package}/bin/npm ci --legacy-peer-deps";
        ExecStart = "${cfg.package}/bin/npm run start";
        Restart = "on-failure";
      };
    };
  };
}
