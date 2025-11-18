using System.Diagnostics;

namespace IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;

public static class Solver {
  public static double GetScoreSum(Score score, Dictionary<string, double> weights) {
    double res = 0;
    res += score.BuildRate * weights["buildRate"];
    res += score.ExpBonus * weights["expBonus"] * ((score.ExpBoost ?? 0) + 10) / 10.0;
    res += score.Flaggy * weights["flaggy"] * ((score.FlagBoost ?? 0) + 4) / 4.0;
    return res;
  }

  public static async Task<Inventory> SolveAsync(
    Inventory inventory,
    int timeoutMs,
    Dictionary<string, double> weights,
    Func<string, Task>? logCallback,
    CancellationToken ct
  ) {
    async Task Log(string message) {
      if (logCallback != null) {
        await logCallback(message);
      }
    }

    await Log($"Solving with goal {string.Join(", ", weights.Select(kvp => $"{kvp.Key} {kvp.Value}"))}");

    return await Task.Run(async () => {

      var stopwatch = Stopwatch.StartNew();
      Inventory state = inventory.Clone();
      List<Inventory> solutions = [state];
      List<int> allSlots = inventory.AvailableSlotKeys;
      double currentScore = GetScoreSum(state.Score, weights);

      int iteration = 0;
      Random random = new();

      while (stopwatch.ElapsedMilliseconds < timeoutMs && !ct.IsCancellationRequested) {
        iteration++;

        // Clone and save state every 10k iterations
        if (iteration % 10000 == 0) {
          state = inventory.Clone();
          Shuffle(state, random);
          currentScore = GetScoreSum(state.Score, weights);
          solutions.Add(state);
        }

        // Log progress every 100k iterations
        if (iteration % 100000 == 0 && logCallback != null) {
          await logCallback($"Progress: {iteration} iterations, best score: {FormatScore(currentScore)}");
        }

        if (allSlots.Count == 0 || state.CogKeys.Count == 0) {
          break;
        }

        int slotKey = allSlots[random.Next(allSlots.Count)];
        int cogKey = state.CogKeys[random.Next(state.CogKeys.Count)];
        Cog slot = state.Get(slotKey);
        Cog cog = state.Get(cogKey);

        if (slot.Fixed || cog.Fixed || cog.Position().Location == "build") {
          continue;
        }

        state.Move(slotKey, cogKey);
        double newScore = GetScoreSum(state.Score, weights);

        if (newScore > currentScore) {
          currentScore = newScore;
        } else {
          state.Move(slotKey, cogKey);
        }
      }

      if (logCallback != null) {
        await logCallback($"Simulated annealing finished after {stopwatch.ElapsedMilliseconds}ms with {iteration} iterations.");
      }
      stopwatch.Stop();

      Inventory best = solutions.OrderByDescending(inv => GetScoreSum(inv.Score, weights)).First();
      RemoveUselessMoves(best);

      return best;
    }, ct);
  }

  private static void Shuffle(Inventory inventory, Random random, int n = 500) {
    List<int> allSlots = inventory.AvailableSlotKeys;

    for (int i = 0; i < n; i++) {
      if (allSlots.Count == 0 || inventory.CogKeys.Count == 0) {
        break;
      }

      int slotKey = allSlots[random.Next(allSlots.Count)];
      List<int> allKeys = inventory.CogKeys;
      int cogKey = allKeys[random.Next(allKeys.Count)];
      Cog slot = inventory.Get(slotKey);
      Cog cog = inventory.Get(cogKey);

      if (slot.Fixed || cog.Fixed || cog.Position().Location == "build") {
        continue;
      }
      inventory.Move(slotKey, cogKey);
    }
  }

  private static void RemoveUselessMoves(Inventory inventory) {
    Score goal = inventory.Score;
    Dictionary<int, Cog> cogsToMove = inventory.Cogs
      .Where(kvp => kvp.Value.Key != kvp.Value.InitialKey)
      .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

    foreach (var cog1 in cogsToMove) {
      int cog1Key = cog1.Value.Key;
      int cog2Key = cog1.Value.InitialKey;
      inventory.Move(cog1Key, cog2Key);

      Score changed = inventory.Score;
      if (changed.BuildRate == goal.BuildRate
          && changed.Flaggy == goal.Flaggy
          && changed.ExpBonus == goal.ExpBonus
          && changed.ExpBoost == goal.ExpBoost
          && changed.FlagBoost == goal.FlagBoost) {
        continue;
      }

      inventory.Move(cog1Key, cog2Key);
    }
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
    } else if (abs < 1_000_000_000_000_000) {
      // Math.ceil(e / 1e9) + 'B'
      return $"{sign}{Math.Ceiling(abs / 1_000_000_000.0)}B";
    } else if (abs < 1_000_000_000_000_000_000) {
      // Math.ceil(e / 1e12) + 'T'
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
}

