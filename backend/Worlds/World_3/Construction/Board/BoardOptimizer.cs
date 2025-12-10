using System.Drawing;

namespace IdleonHelperBackend.Worlds.World_3.Construction.Board;

public static class BoardOptimizer {
  public static readonly Dictionary<string, double> SolverWeights = new Dictionary<string, double> {
    { "buildRate", 1.0 },
    { "expBonus", 100.0 },
    { "flaggy", 250.0 }
  };

  // Store inventories per session/source
  private static readonly Dictionary<string, Inventory> Inventories = [];

  // Preserve original inventory for reconciliation/debugging
  private static readonly Dictionary<string, Inventory> InitialInventories = [];

  public const int SPARE_COLUMNS = 3;
  public const int SPARE_ROWS = 5;
  public const int COGS_STEP = 48;

  public static readonly Point SpareFirstCoords = new(25, 130);
  public static readonly Point BoardFirstCoords = new(210, 130);

  private static string FormatLocation(string location, int x, int y, int? page) {
    var loc = location.ToUpperInvariant();
    var coords = $"{x}, {y}";
    return page.HasValue ? $"{loc} {coords} PAGE {page.Value}" : $"{loc} {coords}";
  }

  private static int CalculateSparePage(int yPosition) {
    return (yPosition / SPARE_ROWS) + 1;
  }

  public static Task<ScoreCardData> LoadJsonData(string data, string source, CancellationToken ct) {
    var inv = InventoryExtractor.ExtractFromJson(data);

    // Store inventory for this session and preserve the initial snapshot
    InitialInventories[source] = inv.Clone();
    Inventories[source] = inv.Clone();

    // Return formatted score in ScoreCard format
    var score = inv.Score;
    return Task.FromResult(new ScoreCardData {
      BuildRate = FormatScore(score.BuildRate),
      ExpBonus = FormatScore(score.ExpBonus),
      Flaggy = FormatScore(score.Flaggy)
    });
  }

  public static Inventory? GetInventory(string source) {
    return Inventories.GetValueOrDefault(source);
  }

  public static Inventory? GetInitialInventory(string source) {
    return InitialInventories.TryGetValue(source, out var inv) ? inv.Clone() : null;
  }

  public static async Task<OptimizationResult> Optimize(
    string source,
    int timeInSeconds,
    CancellationToken ct
  ) {
    if (!Inventories.TryGetValue(source, out var inventory)) {
      throw new Exception("Inventory not found. Please load JSON data first.");
    }

    var weights = new Dictionary<string, double>(SolverWeights);

    // Adjust weights if no flags
    if (inventory.FlagPose.Count == 0) {
      weights["flaggy"] = 0;
    }

    var currentScore = inventory.Score;
    var currentScoreSum = Solver.GetScoreSum(currentScore, weights);
    Console.WriteLine(
      $"[Construction] Optimize start score: buildRate={currentScore.BuildRate}, expBonus={currentScore.ExpBonus}, flaggy={currentScore.Flaggy}, sum={currentScoreSum}");

    var timeoutMs = timeInSeconds * 1000;

    // Single solver instance (multi-instance did not provide value on single core)
    var bestInv = await Solver.SolveAsync(inventory, timeoutMs, weights, ct);
    var bestScoreSum = Solver.GetScoreSum(bestInv.Score, weights);
    Console.WriteLine(
      $"[Construction] Optimize best score: buildRate={bestInv.Score.BuildRate}, expBonus={bestInv.Score.ExpBonus}, flaggy={bestInv.Score.Flaggy}, sum={bestScoreSum}");

    var bestScore = bestInv.Score;

    // Validate that extracted steps match the optimal board
    var steps = Steps.GetOptimalSteps(bestInv.Cogs, ct);
    var clone = inventory.Clone();
    for (var stepIndex = 0; stepIndex < steps.Count; stepIndex++) {
      var step = steps[stepIndex];
      var fromCog = clone.Get(step.KeyFrom);
      var toCog = clone.Get(step.KeyTo);
      var fromPos = fromCog.Position();
      var toPos = toCog.Position(step.KeyTo);

      var fromPage = fromPos.Location == "spare" ? CalculateSparePage(fromPos.Y) : (int?)null;
      var toPage = toPos.Location == "spare" ? CalculateSparePage(toPos.Y) : (int?)null;

      Console.WriteLine(
        $"[Construction] STEP {stepIndex + 1}/{steps.Count}: " +
        $"{FormatLocation(fromPos.Location, fromPos.X, fromPos.Y, fromPage)} TO " +
        $"{FormatLocation(toPos.Location, toPos.X, toPos.Y, toPage)}");

      clone.Move(step.KeyFrom, step.KeyTo);
    }

    var cloneScoreSum = Solver.GetScoreSum(clone.Score, weights);

    Console.WriteLine(
      $"[Construction] Optimize clone score: buildRate={clone.Score.BuildRate}, expBonus={clone.Score.ExpBonus}, flaggy={clone.Score.Flaggy}, sum={cloneScoreSum}");


    // Store the optimized inventory so BoardApplier can retrieve it
    Inventories[source] = bestInv;

    return new OptimizationResult {
      Before = new ScoreCardData {
        BuildRate = FormatScore(currentScore.BuildRate),
        ExpBonus = FormatScore(currentScore.ExpBonus),
        Flaggy = FormatScore(currentScore.Flaggy)
      },
      After = new ScoreCardData {
        BuildRate = FormatScore(bestScore.BuildRate),
        ExpBonus = FormatScore(bestScore.ExpBonus),
        Flaggy = FormatScore(bestScore.Flaggy)
      },
      BuildRateDiff = FormatScoreDiff(bestScore.BuildRate - currentScore.BuildRate),
      ExpBonusDiff = FormatScoreDiff(bestScore.ExpBonus - currentScore.ExpBonus),
      FlaggyDiff = FormatScoreDiff(bestScore.Flaggy - currentScore.Flaggy)
    };
  }

  private static string FormatScore(double score) {
    var abs = Math.Abs(score);

    switch (abs) {
      // Extract from notateNumber default case (ignoring special s cases)
      case < 100:
      case < 1_000:
        return $"{Math.Floor(abs)}";
      case < 10_000:
        // Math.ceil(e / 10) / 100 + 'K'
        return $"{Math.Ceiling(abs / 10.0) / 100.0}K";
      case < 100_000:
        // Math.ceil(e / 100) / 10 + 'K'
        return $"{Math.Ceiling(abs / 100.0) / 10.0}K";
      case < 1_000_000:
        // Math.ceil(e / 1e3) + 'K'
        return $"{Math.Ceiling(abs / 1_000.0)}K";
      case < 10_000_000:
        // Math.ceil(e / 1e4) / 100 + 'M'
        return $"{Math.Ceiling(abs / 10_000.0) / 100.0}M";
      case < 100_000_000:
        // Math.ceil(e / 1e5) / 10 + 'M'
        return $"{Math.Ceiling(abs / 100_000.0) / 10.0}M";
      case < 10_000_000_000:
        // Math.ceil(e / 1e6) + 'M'
        return $"{Math.Ceiling(abs / 1_000_000.0)}M";
      case < 10_000_000_000_000:
        // Math.ceil(e / 1e9) + 'B' (1e13 threshold)
        return $"{Math.Ceiling(abs / 1_000_000_000.0)}B";
      case < 10_000_000_000_000_000:
        // Math.ceil(e / 1e12) + 'T' (1e16 threshold)
        return $"{Math.Ceiling(abs / 1_000_000_000_000.0)}T";
      case < 1e22:
        // Math.ceil(e / 1e15) + 'Q'
        return $"{Math.Ceiling(abs / 1_000_000_000_000_000.0)}Q";
      case < 1e24:
        // Math.ceil(e / 1e18) + 'QQ'
        return $"{Math.Ceiling(abs / 1e18)}QQ";
      default: {
        // For very large numbers, use E notation
        var exp = Math.Floor(Math.Log10(abs));
        var mantissa = Math.Floor((abs / Math.Pow(10, exp)) * 100) / 100.0;
        return $"{mantissa}E{exp}";
      }
    }
  }

  private static string FormatScoreDiff(double score) {
    var sign = score >= 0 ? "+" : "-";
    var abs = Math.Abs(score);

    switch (abs) {
      // Extract from notateNumber default case (ignoring special s cases)
      case < 100:
      case < 1_000:
        return $"{sign}{Math.Floor(abs)}";
      case < 10_000:
        // Math.ceil(e / 10) / 100 + 'K'
        return $"{sign}{Math.Ceiling(abs / 10.0) / 100.0}K";
      case < 100_000:
        // Math.ceil(e / 100) / 10 + 'K'
        return $"{sign}{Math.Ceiling(abs / 100.0) / 10.0}K";
      case < 1_000_000:
        // Math.ceil(e / 1e3) + 'K'
        return $"{sign}{Math.Ceiling(abs / 1_000.0)}K";
      case < 10_000_000:
        // Math.ceil(e / 1e4) / 100 + 'M'
        return $"{sign}{Math.Ceiling(abs / 10_000.0) / 100.0}M";
      case < 100_000_000:
        // Math.ceil(e / 1e5) / 10 + 'M'
        return $"{sign}{Math.Ceiling(abs / 100_000.0) / 10.0}M";
      case < 10_000_000_000:
        // Math.ceil(e / 1e6) + 'M'
        return $"{sign}{Math.Ceiling(abs / 1_000_000.0)}M";
      case < 10_000_000_000_000:
        // Math.ceil(e / 1e9) + 'B' (1e13 threshold)
        return $"{sign}{Math.Ceiling(abs / 1_000_000_000.0)}B";
      case < 10_000_000_000_000_000:
        // Math.ceil(e / 1e12) + 'T' (1e16 threshold)
        return $"{sign}{Math.Ceiling(abs / 1_000_000_000_000.0)}T";
      case < 1e22:
        // Math.ceil(e / 1e15) + 'Q'
        return $"{sign}{Math.Ceiling(abs / 1_000_000_000_000_000.0)}Q";
      case < 1e24:
        // Math.ceil(e / 1e18) + 'QQ'
        return $"{sign}{Math.Ceiling(abs / 1e18)}QQ";
      default: {
        // For very large numbers, use E notation
        var exp = Math.Floor(Math.Log10(abs));
        var mantissa = Math.Floor((abs / Math.Pow(10, exp)) * 100) / 100.0;
        return $"{sign}{mantissa}E{exp}";
      }
    }
  }
}

public class ScoreCardData {
  public string BuildRate { get; set; } = "";
  public string ExpBonus { get; set; } = "";
  public string Flaggy { get; set; } = "";
  public string? AfterBuildRate { get; set; }
  public string? AfterExpBonus { get; set; }
  public string? AfterFlaggy { get; set; }
  public string? BuildRateDiff { get; set; }
  public string? ExpBonusDiff { get; set; }
  public string? FlaggyDiff { get; set; }
}

public class OptimizationResult {
  public ScoreCardData Before { get; set; } = new();
  public ScoreCardData After { get; set; } = new();
  public string BuildRateDiff { get; set; } = "";
  public string ExpBonusDiff { get; set; } = "";
  public string FlaggyDiff { get; set; } = "";
}
