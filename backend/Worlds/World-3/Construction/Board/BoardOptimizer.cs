using System.Drawing;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;

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

  public static async Task<Score> LoadJsonData(string data, string source, Func<string, Task>? logCallback, CancellationToken ct) {
      var rawData = JsonConvert.DeserializeObject<JObject>(data) ?? throw new Exception("JSON data is null.");

      var inv = new Inventory();

      async Task Log(string message) {
        if (logCallback != null) {
          await logCallback(message);
        }
      }

      if(rawData["GemItemsPurchased"] is JValue gemItemValue) {
        JArray gemItemsPurchased = JArray.Parse(gemItemValue.ToString());

        inv.FlaggyShopUpgrades = (int)gemItemsPurchased[184];
        await Log($"Flaggy shop upgrades loaded successfully ({inv.FlaggyShopUpgrades}).");
      }

      if(rawData["CogM"] is JValue cogValue) {
        JObject cogM = JObject.Parse(cogValue.ToString());

        Dictionary<int, Cog> cogDict = cogM.Properties()
          .ToDictionary(
              prop => int.Parse(prop.Name),
              prop => {
                int keyNum = int.Parse(prop.Name);
                JObject c = (JObject)prop.Value;
                return new Cog {
                  Key = keyNum,
                  InitialKey = keyNum,
                  BuildRate = c.Value<double>("a"),
                  IsPlayer = c.Value<double>("b") > 0,
                  ExpGain = c.Value<double>("b"),
                  Flaggy = c.Value<double>("c"),
                  ExpBonus = c.Value<double>("d"),
                  BuildRadiusBoost = c.Value<double>("e"),
                  ExpRadiusBoost = c.Value<double>("f"),
                  FlaggyRadiusBoost = c.Value<double>("g"),
                  BoostRadius = c.Value<string>("h") ?? "",
                  FlagBoost = c.Value<double>("j"),
                  Nothing = c.Value<double>("k"),
                  Fixed = c.Value<string>("h") == "everything",
                  Blocked = false
                };
              }
          );

        inv.Cogs = cogDict;
        await Log($"Cogs loaded successfully ({inv.Cogs.Count}).");
      }

      if(rawData["FlagP"] is JValue flagPValue) {
        JArray flagPArray = JArray.Parse(flagPValue.ToString());
        var newFlagPose = flagPArray.Where(v => v.Value<int>() >= 0).Select(v => v.Value<int>()).ToList();

        inv.FlagPose = newFlagPose;
        await Log($"Flag pose loaded successfully ({inv.FlagPose.Count}).");
      }

      if(rawData["FlagU"] is JValue flagUValue) {
        JArray flagUArray = JArray.Parse(flagUValue.ToString());

        Dictionary<int, Cog> slotsFlags = [];

        foreach(var (n, i) in flagUArray.Select((n, i) => (n, i))) {
          int value = n.Value<int>();
          if(value > 0 && inv.FlagPose.Contains(i)) {
            slotsFlags[i] = new Cog {
              Key = i,
              IsFlag = true,
              Fixed = true,
              Blocked = true,
            };
          } else if(value != -11) {
            slotsFlags[i] = new Cog {
              Key = i,
              Fixed = true,
              Blocked = true,
            };
          } else {
            slotsFlags[i] = new Cog {
              Key = i,
            };
          }
        }

        inv.Slots = slotsFlags;

        foreach(var slot in slotsFlags) {
          var slotV = slot.Value;
          if(!slotV.Fixed) {
            if(inv.AvailableSlotKeys.Contains(slotV.Key)) {
              inv.AvailableSlotKeys.Remove(slotV.Key);
            }
            inv.AvailableSlotKeys.Add(slotV.Key);
          }
        }
        await Log($"Flag upgrades loaded successfully ({inv.Slots.Count}).");
      }

      // Store inventory for this session
      inventories[source] = inv;

      await Log("JSON data loaded successfully.");

      // Return the score
      return await Task.FromResult(inv.Score);
    }

  public static Inventory? GetInventory(string source) {
    return inventories.TryGetValue(source, out var inv) ? inv : null;
  }

  public static async Task<OptimizationResult> Optimize(
    string source,
    int timeInSeconds,
    Func<string, Task>? logCallback,
    CancellationToken ct
  ) {
    if (!inventories.TryGetValue(source, out var inventory) || inventory == null) {
      throw new Exception("Inventory not found. Please load JSON data first.");
    }

    async Task Log(string message) {
      if (logCallback != null) {
        await logCallback(message);
      }
    }

    var weights = new Dictionary<string, double>(SOLVER_WEIGHTS);

    // Adjust weights if no flags
    if (inventory.FlagPose.Count == 0) {
      weights["flaggy"] = 0;
      await Log("No flags found, setting flaggy weight to 0.");
    }

    await Log($"Solving with goal {string.Join(", ", weights.Select(kvp => $"{kvp.Key} {kvp.Value}"))}");

    Score currentScore = inventory.Score;
    double currentScoreSum = Solver.GetScoreSum(currentScore, weights);

    await Log($"Starting solver with time {timeInSeconds} seconds...");

    int timeoutMs = timeInSeconds * 1000;
    Inventory bestInv = await Solver.SolveAsync(inventory, timeoutMs, weights, logCallback, ct);

    Score bestScore = bestInv.Score;
    double bestScoreSum = Solver.GetScoreSum(bestScore, weights);

    await Log($"Score before optimization: {FormatScore(currentScoreSum)}");
    await Log($"Score after optimization: {FormatScore(bestScoreSum)}");
    await Log($"Difference: {CalculateDifference(bestScoreSum, currentScoreSum)}");

    return new OptimizationResult {
      Before = currentScore,
      After = bestScore,
      BeforeSum = currentScoreSum,
      AfterSum = bestScoreSum,
      Difference = bestScoreSum - currentScoreSum,
      DifferencePercent = CalculateDifferencePercent(currentScoreSum, bestScoreSum),
      BuildRateDiff = bestScore.BuildRate - currentScore.BuildRate,
      ExpBonusDiff = bestScore.ExpBonus - currentScore.ExpBonus,
      FlaggyDiff = bestScore.Flaggy - currentScore.Flaggy,
      ExpBoostDiff = (bestScore.ExpBoost ?? 0) - (currentScore.ExpBoost ?? 0),
      FlagBoostDiff = (bestScore.FlagBoost ?? 0) - (currentScore.FlagBoost ?? 0)
    };
  }

  private static string FormatScore(double score) {
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

public class OptimizationResult {
  public Score Before { get; set; } = new();
  public Score After { get; set; } = new();
  public double BeforeSum { get; set; }
  public double AfterSum { get; set; }
  public double Difference { get; set; }
  public double DifferencePercent { get; set; }
  public double BuildRateDiff { get; set; }
  public double ExpBonusDiff { get; set; }
  public double FlaggyDiff { get; set; }
  public double ExpBoostDiff { get; set; }
  public double FlagBoostDiff { get; set; }
}
