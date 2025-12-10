
namespace IdleonHelperBackend.Utils;

public static class Navigation {
  public static string GetAssetsBasePath() {
    var devPath = Path.Combine(Directory.GetCurrentDirectory(), "Assets");
    if (Directory.Exists(devPath)) {
      return devPath;
    }

    var basePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Assets");
    return Directory.Exists(basePath) ? basePath : throw new FileNotFoundException("Assets folder not found");
  }


  public static string GetAssetPath(string relativePath) {
    return Path.Combine(GetAssetsBasePath(), relativePath);
  }
}
