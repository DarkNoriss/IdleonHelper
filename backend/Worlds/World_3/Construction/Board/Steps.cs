namespace IdleonHelperBackend.Worlds.World_3.Construction.Board;

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
      var (from, outOfPlace) = working.FirstOrDefault(kvp => kvp.Key != kvp.Value.Key);
      if (outOfPlace == null) {
        break;
      }

      var to = outOfPlace.Key;

      // Record the swap step
      steps.Add(new Step(outOfPlace, from, to));

      // Simulate the swap in the working inventory to keep positions consistent
      Swap(working, from, to);
    }

    return steps;
  }

  private static void Swap(Dictionary<int, Cog> inv, int from, int to) {
    (inv[from], inv[to]) = (inv[to], inv[from]);
  }
}

public class Step(Cog cog, int keyFrom, int keyTo) {
  public Cog Cog { get; set; } = cog;
  public int KeyFrom { get; set; } = keyFrom;
  public int KeyTo { get; set; } = keyTo;
}

