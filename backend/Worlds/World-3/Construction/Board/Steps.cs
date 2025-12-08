namespace IdleonHelperBackend.Worlds.World3.Construction.Board.BoardOptimizer;

public static class Steps {
  public static List<Step> GetOptimalSteps(Dictionary<int, Cog> optimized, CancellationToken ct) {
    // Work on a mutable view keyed by current position (InitialKey), preserving desired Key
    // working dictionary keyed by current position; value contains desired Key
    var working = optimized.Values.ToDictionary(c => c.InitialKey, c => new Cog(c));
    List<Step> steps = [];

    // Continue until every cog is at its desired position (Key == InitialKey)
    while (true) {
      ct.ThrowIfCancellationRequested();

      // Find a cog that is not in its desired position (dictionary key is current position)
      var kvp = working.FirstOrDefault(kvp => kvp.Key != kvp.Value.Key);
      if (kvp.Value == null) {
        break;
      }

      int from = kvp.Key;           // current position
      var outOfPlace = kvp.Value;   // cog currently at 'from'
      int to = outOfPlace.Key;      // desired position

      // Identify the cog currently sitting at the target position
      var targetCog = working[to];

      // Record the swap step
      steps.Add(new Step(outOfPlace, targetCog, from, to));

      // Simulate the swap in the working inventory to keep positions consistent
      Swap(working, from, to);
    }

    return steps;
  }

  private static void Swap(Dictionary<int, Cog> inv, int from, int to) {
    (inv[from], inv[to]) = (inv[to], inv[from]);
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

