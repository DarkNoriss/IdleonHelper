using System.Drawing;

namespace IdleonHelperBackend.Worlds.World3.Construction.Board.BoardOptimizer;

public static class BoardOptimizer {
  private static readonly int SOLVER_TIME = 10000;
  public static readonly Dictionary<string, double> SOLVER_WEIGHTS = new() {
    { "buildRate", 1.0 },
    { "expBonus", 100.0 },
    { "flaggy", 250.0 }
  };

  // Store inventories per session/source
  private static readonly Dictionary<string, Inventory> inventories = new();

  public const int SPARE_COLUMNS = 5;
  public const int SPARE_ROWS = 3;
  public const int COGS_STEP = 47;
  public static readonly Point SPARE_FIRST_COORDS = new(25, 130);
  public static readonly Point BOARD_FIRST_COORDS = new(210, 130);
  public static readonly Point COLLECT_ULTIMATE_COGS = new(291, 420);

  public static async Task<ScoreCardData> LoadJsonData(string data, string source, CancellationToken ct) {
      var inv = InventoryExtractor.ExtractFromJson(data);

      // Store inventory for this session
      inventories[source] = inv;

      // Return formatted score in ScoreCard format
      var score = inv.Score;
      return new ScoreCardData {
        BuildRate = FormatScore(score.BuildRate),
        ExpBonus = FormatScore(score.ExpBonus),
        Flaggy = FormatScore(score.Flaggy)
      };
    }

  public static Inventory? GetInventory(string source) {
    return inventories.TryGetValue(source, out var inv) ? inv : null;
  }

  public static async Task<OptimizationResult> Optimize(
    string source,
    int timeInSeconds,
    CancellationToken ct
  ) {
    if (!inventories.TryGetValue(source, out var inventory) || inventory == null) {
      throw new Exception("Inventory not found. Please load JSON data first.");
    }

    var weights = new Dictionary<string, double>(SOLVER_WEIGHTS);

    // Adjust weights if no flags
    if (inventory.FlagPose.Count == 0) {
      weights["flaggy"] = 0;
    }

    Score currentScore = inventory.Score;
    double currentScoreSum = Solver.GetScoreSum(currentScore, weights);

    int timeoutMs = timeInSeconds * 1000;
    
    // Run 4 solver instances in parallel and pick the best result
    var solverTasks = new List<Task<Inventory>>();
    for (int i = 0; i < 4; i++) {
      solverTasks.Add(Solver.SolveAsync(inventory, timeoutMs, weights, ct));
    }
    
    Inventory[] results = await Task.WhenAll(solverTasks);
    
    // Find the best inventory based on score sum
    Inventory bestInv = results[0];
    double bestScoreSum = Solver.GetScoreSum(bestInv.Score, weights);
    
    for (int i = 1; i < results.Length; i++) {
      double scoreSum = Solver.GetScoreSum(results[i].Score, weights);
      if (scoreSum > bestScoreSum) {
        bestScoreSum = scoreSum;
        bestInv = results[i];
      }
    }

    Score bestScore = bestInv.Score;

    // Validate that extracted steps match the optimal board
    List<Step> steps = Steps.GetOptimalSteps(bestInv.Cogs, ct);
    Inventory clone = inventory.Clone();
    foreach (var step in steps) {
      clone.Move(step.KeyFrom, step.KeyTo);
    }

    Score cloneScore = clone.Score;
    double cloneScoreSum = Solver.GetScoreSum(cloneScore, weights);

    // Store the optimized inventory so BoardApplier can retrieve it
    inventories[source] = bestInv;

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
    double abs = Math.Abs(score);

    // Extract from notateNumber default case (ignoring special s cases)
    if (abs < 100) {
      return $"{Math.Floor(abs)}";
    } else if (abs < 1_000) {
      return $"{Math.Floor(abs)}";
    } else if (abs < 10_000) {
      // Math.ceil(e / 10) / 100 + 'K'
      return $"{Math.Ceiling(abs / 10.0) / 100.0}K";
    } else if (abs < 100_000) {
      // Math.ceil(e / 100) / 10 + 'K'
      return $"{Math.Ceiling(abs / 100.0) / 10.0}K";
    } else if (abs < 1_000_000) {
      // Math.ceil(e / 1e3) + 'K'
      return $"{Math.Ceiling(abs / 1_000.0)}K";
    } else if (abs < 10_000_000) {
      // Math.ceil(e / 1e4) / 100 + 'M'
      return $"{Math.Ceiling(abs / 10_000.0) / 100.0}M";
    } else if (abs < 100_000_000) {
      // Math.ceil(e / 1e5) / 10 + 'M'
      return $"{Math.Ceiling(abs / 100_000.0) / 10.0}M";
    } else if (abs < 10_000_000_000) {
      // Math.ceil(e / 1e6) + 'M'
      return $"{Math.Ceiling(abs / 1_000_000.0)}M";
    } else if (abs < 10_000_000_000_000) {
      // Math.ceil(e / 1e9) + 'B' (1e13 threshold)
      return $"{Math.Ceiling(abs / 1_000_000_000.0)}B";
    } else if (abs < 10_000_000_000_000_000) {
      // Math.ceil(e / 1e12) + 'T' (1e16 threshold)
      return $"{Math.Ceiling(abs / 1_000_000_000_000.0)}T";
    } else if (abs < 1e22) {
      // Math.ceil(e / 1e15) + 'Q'
      return $"{Math.Ceiling(abs / 1_000_000_000_000_000.0)}Q";
    } else if (abs < 1e24) {
      // Math.ceil(e / 1e18) + 'QQ'
      return $"{Math.Ceiling(abs / 1e18)}QQ";
    } else {
      // For very large numbers, use E notation
      double exp = Math.Floor(Math.Log10(abs));
      double mantissa = Math.Floor((abs / Math.Pow(10, exp)) * 100) / 100.0;
      return $"{mantissa}E{exp}";
    }
  }

  private static string FormatScoreDiff(double score) {
    string sign = score >= 0 ? "+" : "-";
    double abs = Math.Abs(score);

    // Extract from notateNumber default case (ignoring special s cases)
    if (abs < 100) {
      return $"{sign}{Math.Floor(abs)}";
    } else if (abs < 1_000) {
      return $"{sign}{Math.Floor(abs)}";
    } else if (abs < 10_000) {
      // Math.ceil(e / 10) / 100 + 'K'
      return $"{sign}{Math.Ceiling(abs / 10.0) / 100.0}K";
    } else if (abs < 100_000) {
      // Math.ceil(e / 100) / 10 + 'K'
      return $"{sign}{Math.Ceiling(abs / 100.0) / 10.0}K";
    } else if (abs < 1_000_000) {
      // Math.ceil(e / 1e3) + 'K'
      return $"{sign}{Math.Ceiling(abs / 1_000.0)}K";
    } else if (abs < 10_000_000) {
      // Math.ceil(e / 1e4) / 100 + 'M'
      return $"{sign}{Math.Ceiling(abs / 10_000.0) / 100.0}M";
    } else if (abs < 100_000_000) {
      // Math.ceil(e / 1e5) / 10 + 'M'
      return $"{sign}{Math.Ceiling(abs / 100_000.0) / 10.0}M";
    } else if (abs < 10_000_000_000) {
      // Math.ceil(e / 1e6) + 'M'
      return $"{sign}{Math.Ceiling(abs / 1_000_000.0)}M";
    } else if (abs < 10_000_000_000_000) {
      // Math.ceil(e / 1e9) + 'B' (1e13 threshold)
      return $"{sign}{Math.Ceiling(abs / 1_000_000_000.0)}B";
    } else if (abs < 10_000_000_000_000_000) {
      // Math.ceil(e / 1e12) + 'T' (1e16 threshold)
      return $"{sign}{Math.Ceiling(abs / 1_000_000_000_000.0)}T";
    } else if (abs < 1e22) {
      // Math.ceil(e / 1e15) + 'Q'
      return $"{sign}{Math.Ceiling(abs / 1_000_000_000_000_000.0)}Q";
    } else if (abs < 1e24) {
      // Math.ceil(e / 1e18) + 'QQ'
      return $"{sign}{Math.Ceiling(abs / 1e18)}QQ";
    } else {
      // For very large numbers, use E notation
      double exp = Math.Floor(Math.Log10(abs));
      double mantissa = Math.Floor((abs / Math.Pow(10, exp)) * 100) / 100.0;
      return $"{sign}{mantissa}E{exp}";
    }
  }

  private static string CalculateDifference(double before, double after) {
    double difference = after - before;
    double percentDifference = Math.Round(difference / Math.Abs(before) * 100, 3);
    return $"{percentDifference}%";
  }

  private static double CalculateDifferencePercent(double before, double after) {
    double difference = after - before;
    if (Math.Abs(before) < 0.0001) {
      // Avoid division by zero - if before is essentially zero, return 0% or handle appropriately
      return difference >= 0 ? 100 : -100;
    }
    return Math.Round((difference / Math.Abs(before)) * 100, 3);
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
