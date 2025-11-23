namespace IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;

public static class Steps {
  public static List<Step> GetOptimalSteps(Dictionary<int, Cog> optimized, CancellationToken ct) {
    List<Step> steps = [];

    // Find cogs that need to be moved (where Key != InitialKey)
    var cogsToMove = optimized.Values
      .Select(c => new Cog(c))
      .Where(c => c.Key != c.InitialKey)
      .ToList();

    // Build a dictionary of interim cogs (keyed by their initial position)
    var interimCogs = new Dictionary<int, Cog>();
    foreach (var cog in cogsToMove) {
      interimCogs[cog.InitialKey] = cog;
    }

    // Build the optimal sequence of moves
    while (interimCogs.Count > 0) {
      ct.ThrowIfCancellationRequested();

      var firstEntry = interimCogs.First();
      var (key, cog) = firstEntry;
      
      // Find what cog is currently at the target position
      // If no cog is at the target position, create a placeholder
      var targetCog = interimCogs.GetValueOrDefault(cog.Key, new Cog { Key = key, InitialKey = key });

      // If targetCog's InitialKey matches the current key, the slot is already correct
      // (either the cog is already in place, or the placeholder indicates it's empty/correct)
      if (targetCog.InitialKey == key) {
        interimCogs.Remove(key);
        continue;
      }

      // Swap: move cog from its initial position to its target position
      // The cog at the target position needs to be moved to the current position temporarily
      interimCogs[key] = targetCog;

      steps.Add(new Step(cog, targetCog, key, cog.Key));

      // Remove the cog that was moved to its target position
      interimCogs.Remove(cog.Key);
    }

    return steps;
  }
}

public class Step {
  public Cog Cog { get; set; }
  public Cog TargetCog { get; set; }
  public int KeyFrom { get; set; }
  public int KeyTo { get; set; }

  public Step(Cog cog, Cog targetCog, int keyFrom, int keyTo) {
    Cog = cog;
    TargetCog = targetCog;
    KeyFrom = keyFrom;
    KeyTo = keyTo;
  }
}

