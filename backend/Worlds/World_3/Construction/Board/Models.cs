namespace IdleonHelperBackend.Worlds.World_3.Construction.Board;

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
  public string BoostRadius { get; set; }
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

    var location = GetLocation(keyNum.Value);
    var perRow = location == "board" ? 12 : 3;
    var offset = location switch {
      "board" => 0,
      "build" => 96,
      _ => 108
    };

    var y = (keyNum.Value - offset) / perRow;
    var x = (keyNum.Value - offset) % perRow;

    if (isDefault) {
      _position = keyNum.Value;
    }

    return (location, x, y);
  }

  private static string GetLocation(int keyNum) {
    return keyNum switch {
      >= 96 and <= 107 => "build",
      >= 108 => "spare",
      _ => "board"
    };
  }

  private static int GetXValue(int keyNum) {
    return (keyNum >= 96) ? (keyNum - 96) % 3 : (keyNum % 12);
  }

  private static int GetYValue(int keyNum) {
    return (keyNum >= 96) ? (keyNum - 96) / 3 : keyNum / 12;
  }
}

public class Score {
  public double BuildRate { get; set; }
  public double ExpBonus { get; set; }
  public double Flaggy { get; set; }
  public double? ExpBoost { get; set; }
  public double? FlagBoost { get; set; }
}

public class Inventory {
  public const int INV_ROWS = 8;
  public const int INV_COLUMNS = 12;
  public Dictionary<int, Cog> Cogs { get; set; } = [];
  public Dictionary<int, Cog> Slots { get; set; } = [];
  public List<int> FlagPose { get; set; } = [];
  public int FlaggyShopUpgrades { get; set; }
  public List<int> AvailableSlotKeys { get; set; } = [];
  private Score? InventoryScore { get; set; }

  public List<int> CogKeys => [..Cogs.Keys];


  public Cog Get(int key) {
    return Cogs.TryGetValue(key, out var valueCog) ? valueCog : Slots[key];
  }

  public static Score? SaveGet(Score[][] arr, (int row, int col) indexes) {
    var rowIndex = indexes.row;
    var colIndex = indexes.col;

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
      if (InventoryScore != null) {
        return InventoryScore;
      }

      Score result = new() {
        BuildRate = 0,
        ExpBonus = 0,
        Flaggy = 0,
        ExpBoost = 0,
        FlagBoost = 0
      };

      var bonusGrid = Enumerable.Range(0, INV_ROWS)
        .Select(_ => Enumerable.Range(0, INV_COLUMNS)
          .Select(_ => new Score {
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
        var (_, x, y) = entry.Position();
        var i = y;
        var j = x;

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
            for (var k = 0; k < INV_COLUMNS; k++) {
              if (j == k) {
                continue;
              }

              boosted.Add((i, k));
            }

            break;
          case "column":
            for (var k = 0; k < INV_ROWS; k++) {
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
            for (var k = 0; k < INV_ROWS; k++) {
              for (var l = 0; l < INV_COLUMNS; l++) {
                if (i == k && j == l) {
                  continue;
                }

                boosted.Add((k, l));
              }
            }

            break;
        }

        foreach (var bonus in boosted.Select(boostCord => SaveGet(bonusGrid, boostCord)).OfType<Score>()) {
          bonus.BuildRate += entry.BuildRadiusBoost;
          bonus.Flaggy += entry.FlaggyRadiusBoost;
          bonus.ExpBoost = (bonus.ExpBoost ?? 0) + entry.ExpRadiusBoost;
          bonus.FlagBoost = (bonus.FlagBoost ?? 0) + entry.FlagBoost;
        }
      }

      foreach (var entry in AvailableSlotKeys.Select(Get)) {
        result.BuildRate += entry.BuildRate;
        result.ExpBonus += entry.ExpBonus;
        result.Flaggy += entry.Flaggy;

        var pos = entry.Position();
        var bonus = bonusGrid[pos.Y][pos.X];
        var b = (bonus.BuildRate) / 100.0;
        var mathCeil = Math.Ceiling(entry.BuildRate * b);
        result.BuildRate += mathCeil;
        if (entry.IsPlayer) {
          result.ExpBoost = (result.ExpBoost ?? 0) + (bonus.ExpBoost ?? 0);
        }

        var f = (bonus.Flaggy) / 100.0;
        result.Flaggy += Math.Ceiling(entry.Flaggy * f);
      }

      foreach (var bonus in from key in FlagPose
               select Get(key)
               into entry
               select entry.Position()
               into pos
               select bonusGrid[pos.Y][pos.X]) {
        result.FlagBoost = (result.FlagBoost ?? 0) + (bonus.FlagBoost ?? 0);
      }

      var flaggy = result.Flaggy * (1 + FlaggyShopUpgrades * 0.5);
      result.Flaggy = Math.Floor(flaggy);

      return InventoryScore = result;
    }
  }

  public void Move(int pos1, int pos2) {
    InventoryScore = null;

    Cogs.TryGetValue(pos1, out var cog1);
    Cogs.TryGetValue(pos2, out var cog2);

    Cogs[pos2] = cog1!;
    if (cog1 != null) {
      cog1.Key = pos2;
    }
    else {
      Cogs.Remove(pos2);
    }

    Cogs[pos1] = cog2!;
    if (cog2 != null) {
      cog2.Key = pos1;
    }
    else {
      Cogs.Remove(pos1);
    }
  }
}

