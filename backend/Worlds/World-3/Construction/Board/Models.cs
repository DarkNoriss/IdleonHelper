namespace IdleonHelperBackend.Worlds.World3.Construction.Board.BoardOptimizer;

public class Cog {
  private int _key;
  private int? _position;

  public Cog() {
    _key = 0;
    InitialKey = 0;
    BuildRate = 0.0;
    IsPlayer = false;
    IsFlag = false;
    ExpGain = 0.0;
    Flaggy = 0.0;
    ExpBonus = 0.0;
    BuildRadiusBoost = 0.0;
    ExpRadiusBoost = 0.0;
    FlaggyRadiusBoost = 0.0;
    BoostRadius = string.Empty;
    FlagBoost = 0.0;
    Nothing = 0.0;
    Fixed = false;
    Blocked = false;
  }

  public Cog(Cog other) {
    _key = other.Key;
    InitialKey = other.InitialKey;
    BuildRate = other.BuildRate;
    IsPlayer = other.IsPlayer;
    IsFlag = other.IsFlag;
    ExpGain = other.ExpGain;
    Flaggy = other.Flaggy;
    ExpBonus = other.ExpBonus;
    BuildRadiusBoost = other.BuildRadiusBoost;
    ExpRadiusBoost = other.ExpRadiusBoost;
    FlaggyRadiusBoost = other.FlaggyRadiusBoost;
    BoostRadius = other.BoostRadius;
    FlagBoost = other.FlagBoost;
    Nothing = other.Nothing;
    Fixed = other.Fixed;
    Blocked = other.Blocked;
  }

  public int Key {
    get => _key;
    set {
      _position = null;
      _key = Convert.ToInt32(value);
    }
  }

  public int InitialKey { get; set; }
  public double BuildRate { get; set; }
  public bool IsPlayer { get; set; }
  public bool IsFlag { get; set; }
  public double ExpGain { get; set; }
  public double Flaggy { get; set; }
  public double ExpBonus { get; set; }
  public double BuildRadiusBoost { get; set; }
  public double ExpRadiusBoost { get; set; }
  public double FlaggyRadiusBoost { get; set; }
  public string BoostRadius { get; set; } = "";
  public double FlagBoost { get; set; }
  public double Nothing { get; set; }
  public bool Fixed { get; set; }
  public bool Blocked { get; set; }

  public (string Location, int X, int Y) Position(int? keyNum = null) {
    bool isDefault = keyNum == null;

    if (_position.HasValue && isDefault) {
      return (GetLocation(_position.Value), GetXValue(_position.Value), GetYValue(_position.Value));
    }

    keyNum ??= Key;

    string location = GetLocation(keyNum.Value);
    int perRow = location == "board" ? 12 : 3;
    int offset = location == "board" ? 0 : (location == "build" ? 96 : 108);

    int y = (keyNum.Value - offset) / perRow;
    int x = (keyNum.Value - offset) % perRow;

    if (isDefault) {
      _position = keyNum.Value;
    }

    return (location, x, y);
  }

  private static string GetLocation(int keyNum) {
    if (keyNum >= 96 && keyNum <= 107) return "build";
    else if (keyNum >= 108) return "spare";
    return "board";
  }

  private static int GetXValue(int keyNum) {
    return (keyNum >= 96) ? (keyNum - 96) % 3 : (keyNum % 12);
  }

  private static int GetYValue(int keyNum) {
    return (keyNum >= 96) ? (keyNum - 96) / 3 : keyNum / 12;
  }
}

public class Score {
  public double BuildRate { get; set; } = 0;
  public double ExpBonus { get; set; } = 0;
  public double Flaggy { get; set; } = 0;
  public double? ExpBoost { get; set; } = 0;
  public double? FlagBoost { get; set; } = 0;
}

public class Inventory {
  public const int INV_ROWS = 8;
  public const int INV_COLUMNS = 12;
  public Dictionary<int, Cog> Cogs { get; set; } = [];
  public Dictionary<int, Cog> Slots { get; set; } = [];
  public List<int> FlagPose { get; set; } = [];
  public int FlaggyShopUpgrades { get; set; } = 0;
  public List<int> AvailableSlotKeys { get; set; } = [];
  private Score? _score { get; set; } = null;

  public List<int> CogKeys => new(Cogs.Keys);

  public Cog Get(int key) {
    if (Cogs.TryGetValue(key, out Cog? valueCog)) {
      return valueCog;
    }

    return Slots[key];
  }

  public static Score? SaveGet(Score[][] arr, (int row, int col) indexes) {
    int rowIndex = indexes.row;
    int colIndex = indexes.col;

    if (rowIndex < 0 || rowIndex >= INV_ROWS || colIndex < 0 || colIndex >= INV_COLUMNS) {
      return null;
    }

    return arr[rowIndex][colIndex];
  }

  public Inventory Clone() {
    Inventory clone = new();

    Dictionary<int, Cog> clonedCogs = [];
    foreach (var kvp in Cogs) {
      clonedCogs[kvp.Key] = new Cog(kvp.Value);
    }

    Dictionary<int, Cog> clonedSlots = [];
    foreach (var kvp in Slots) {
      clonedSlots[kvp.Key] = new Cog(kvp.Value);
    }

    clone.Cogs = clonedCogs;
    clone.Slots = clonedSlots;
    clone.FlagPose = new List<int>(FlagPose);
    clone.FlaggyShopUpgrades = FlaggyShopUpgrades;
    clone.AvailableSlotKeys = new List<int>(AvailableSlotKeys);

    return clone;
  }

  public Score Score {
    get {
      if (_score != null) {
        return _score;
      }

      Score result = new() {
        BuildRate = 0,
        ExpBonus = 0,
        Flaggy = 0,
        ExpBoost = 0,
        FlagBoost = 0
      };

      Score[][] bonusGrid = Enumerable.Range(0, INV_ROWS)
                                      .Select(i => Enumerable.Range(0, INV_COLUMNS)
                                      .Select(j => new Score {
                                        BuildRate = 0,
                                        ExpBonus = 0,
                                        Flaggy = 0,
                                        ExpBoost = 0,
                                        FlagBoost = 0
                                      })
                                      .ToArray())
                                      .ToArray();

      foreach (var key in AvailableSlotKeys) {
        var entry = Get(key);
        if (string.IsNullOrEmpty(entry.BoostRadius)) {
          continue;
        }
        var boosted = new List<(int, int)>();
        var (Location, X, Y) = entry.Position();
        int i = Y;
        int j = X;

        switch (entry.BoostRadius) {
          case "diagonal":
            boosted.Add((i - 1, j - 1));
            boosted.Add((i - 1, j + 1));
            boosted.Add((i + 1, j - 1));
            boosted.Add((i + 1, j + 1));
            break;
          case "adjacent":
            boosted.Add((i - 1, j));
            boosted.Add((i, j + 1));
            boosted.Add((i + 1, j));
            boosted.Add((i, j - 1));
            break;
          case "up":
            boosted.Add((i - 2, j - 1));
            boosted.Add((i - 2, j));
            boosted.Add((i - 2, j + 1));
            boosted.Add((i - 1, j - 1));
            boosted.Add((i - 1, j));
            boosted.Add((i - 1, j + 1));
            break;
          case "right":
            boosted.Add((i - 1, j + 2));
            boosted.Add((i, j + 2));
            boosted.Add((i + 1, j + 2));
            boosted.Add((i - 1, j + 1));
            boosted.Add((i, j + 1));
            boosted.Add((i + 1, j + 1));
            break;
          case "down":
            boosted.Add((i + 2, j - 1));
            boosted.Add((i + 2, j));
            boosted.Add((i + 2, j + 1));
            boosted.Add((i + 1, j - 1));
            boosted.Add((i + 1, j));
            boosted.Add((i + 1, j + 1));
            break;
          case "left":
            boosted.Add((i - 1, j - 2));
            boosted.Add((i, j - 2));
            boosted.Add((i + 1, j - 2));
            boosted.Add((i - 1, j - 1));
            boosted.Add((i, j - 1));
            boosted.Add((i + 1, j - 1));
            break;
          case "row":
            for (int k = 0; k < INV_COLUMNS; k++) {
              if (j == k) {
                continue;
              }
              boosted.Add((i, k));
            }
            break;
          case "column":
            for (int k = 0; k < INV_ROWS; k++) {
              if (i == k) {
                continue;
              }
              boosted.Add((k, j));
            }
            break;
          case "corner":
            boosted.Add((i - 2, j - 2));
            boosted.Add((i - 2, j + 2));
            boosted.Add((i + 2, j - 2));
            boosted.Add((i + 2, j + 2));
            break;
          case "around":
            boosted.Add((i - 2, j));
            boosted.Add((i - 1, j - 1));
            boosted.Add((i - 1, j));
            boosted.Add((i - 1, j + 1));
            boosted.Add((i, j - 2));
            boosted.Add((i, j - 1));
            boosted.Add((i, j + 1));
            boosted.Add((i, j + 2));
            boosted.Add((i + 1, j - 1));
            boosted.Add((i + 1, j));
            boosted.Add((i + 1, j + 1));
            boosted.Add((i + 2, j));
            break;
          case "everything":
            for (int k = 0; k < INV_ROWS; k++) {
              for (int l = 0; l < INV_COLUMNS; l++) {
                if (i == k && j == l) {
                  continue;
                }
                boosted.Add((k, l));
              }
            }
            break;
          default:
            break;
        }

        foreach (var boostCord in boosted) {
          var bonus = SaveGet(bonusGrid, boostCord);
          if (bonus == null) {
            continue;
          }

          bonus.BuildRate += entry.BuildRadiusBoost;
          bonus.Flaggy += entry.FlaggyRadiusBoost;
          bonus.ExpBoost = (bonus.ExpBoost ?? 0) + entry.ExpRadiusBoost;
          bonus.FlagBoost = (bonus.FlagBoost ?? 0) + entry.FlagBoost;
        }
      }

      foreach (var key in AvailableSlotKeys) {
        var entry = Get(key);

        result.BuildRate += entry.BuildRate;
        result.ExpBonus += entry.ExpBonus;
        result.Flaggy += entry.Flaggy;

        var pos = entry.Position();
        var bonus = bonusGrid[pos.Y][pos.X];
        var b = (bonus.BuildRate) / 100.0;
        double mathCeil = Math.Ceiling(entry.BuildRate * b);
        result.BuildRate += mathCeil;
        if (entry.IsPlayer) {
          result.ExpBoost = (result.ExpBoost ?? 0) + (bonus.ExpBoost ?? 0);
        }
        var f = (bonus.Flaggy) / 100.0;
        result.Flaggy += Math.Ceiling(entry.Flaggy * f);
      }

      foreach (var key in FlagPose) {
        var entry = Get(key);
        var pos = entry.Position();
        var bonus = bonusGrid[pos.Y][pos.X];
        result.FlagBoost = (result.FlagBoost ?? 0) + (bonus.FlagBoost ?? 0);
      }
      double flaggy = result.Flaggy * (1 + FlaggyShopUpgrades * 0.5);
      result.Flaggy = Math.Floor(flaggy);

      return _score = result;
    }
  }

  public void Move(int pos1, int pos2) {
    _score = null;

    Cogs.TryGetValue(pos1, out Cog? cog1);
    Cogs.TryGetValue(pos2, out Cog? cog2);

    Cog? temp = cog2;

    Cogs[pos2] = cog1!;
    if (cog1 != null) {
      cog1.Key = pos2;
    } else {
      Cogs.Remove(pos2);
    }

    Cogs[pos1] = temp!;
    if (temp != null) {
      temp.Key = pos1;
    } else {
      Cogs.Remove(pos1);
    }
  }
}

