using System.Diagnostics;

namespace IdleonHelperBackend.Worlds.World_3.Construction.Board;

public static class Solver {
  public static double GetScoreSum(Score score, Dictionary<string, double> weights) {
    double res = 0;
    res += score.BuildRate * weights["buildRate"];
    res += score.ExpBonus * weights["expBonus"] * ((score.ExpBoost ?? 0) + 10) / 10;
    res += score.Flaggy * weights["flaggy"] * ((score.FlagBoost ?? 0) + 4) / 4;
    return res;
  }

  public static async Task<Inventory> SolveAsync(
    Inventory inventory,
    int timeoutMs,
    Dictionary<string, double> weights,
    CancellationToken ct
  ) {
    return await Task.Run(() => {
      var stopwatch = Stopwatch.StartNew();
      var state = inventory.Clone();
      List<Inventory> solutions = [state];
      var allSlots = inventory.AvailableSlotKeys;
      var currentScore = GetScoreSum(state.Score, weights);
      var random = new Random();

      var iteration = 0;

      while (stopwatch.ElapsedMilliseconds < timeoutMs && !ct.IsCancellationRequested) {
        iteration++;

        if (iteration % 10000 == 0) {
          state = inventory.Clone();
          Shuffle(state);
          currentScore = GetScoreSum(state.Score, weights);
          solutions.Add(state);
        }

        var slotKey = allSlots[random.Next(allSlots.Count)];
        // Moving a cog to an empty space changes the list of cog keys, so we need to re-fetch this
        var allKeys = state.CogKeys;
        var cogKey = allKeys[random.Next(allKeys.Count)];
        var slot = state.Get(slotKey);
        var cog = state.Get(cogKey);

        if (slot.Fixed || cog.Fixed || cog.Position().Location == "build") {
          continue;
        }

        state.Move(slotKey, cogKey);
        var newScore = GetScoreSum(state.Score, weights);

        if (newScore > currentScore) {
          currentScore = newScore;
        }
        else {
          state.Move(slotKey, cogKey);
        }
      }

      stopwatch.Stop();

      var scores = solutions.Select(s => GetScoreSum(s.Score, weights)).ToList();

      var bestIndex = scores.IndexOf(scores.Max());
      var best = solutions[bestIndex];

      // RemoveUselessMoves(best);

      return best;
    }, ct);
  }

  private static void Shuffle(Inventory inventory, int n = 500) {
    var allSlots = inventory.AvailableSlotKeys;
    var random = new Random();

    for (var i = 0; i < n; i++) {
      var slotKey = allSlots[random.Next(allSlots.Count)];
      var allKeys = inventory.CogKeys;
      var cogKey = allKeys[random.Next(allKeys.Count)];
      var slot = inventory.Get(slotKey);
      var cog = inventory.Get(cogKey);

      if (slot.Fixed || cog.Fixed || cog.Position().Location == "build") {
        continue;
      }

      inventory.Move(slotKey, cogKey);
    }
  }

  // private static void RemoveUselessMoves(Inventory inventory) {
  //   var goal = inventory.Score;
  //   var cogsToMove = inventory.Cogs
  //     .Where(kvp => kvp.Value.Key != kvp.Value.InitialKey)
  //     .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

  //   foreach (var cog1 in cogsToMove) {
  //     var cog1Key = cog1.Value.Key;
  //     var cog2Key = cog1.Value.InitialKey;
  //     inventory.Move(cog1Key, cog2Key);

  //     var changed = inventory.Score;
  //     if (ScoresEqual(changed, goal)) {
  //       continue;
  //     }

  //     inventory.Move(cog1Key, cog2Key);
  //   }
  // }

  // private static bool ScoresEqual(Score left, Score right, double tolerance = 1e-6) {
  //   return AlmostEqual(left.BuildRate, right.BuildRate, tolerance)
  //          && AlmostEqual(left.Flaggy, right.Flaggy, tolerance)
  //          && AlmostEqual(left.ExpBonus, right.ExpBonus, tolerance)
  //          && AlmostEqual(left.ExpBoost ?? 0, right.ExpBoost ?? 0, tolerance)
  //          && AlmostEqual(left.FlagBoost ?? 0, right.FlagBoost ?? 0, tolerance);
  // }

  // private static bool AlmostEqual(double left, double right, double tolerance) {
  //   return Math.Abs(left - right) <= tolerance;
  // }
}

