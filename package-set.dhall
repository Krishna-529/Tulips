[ 
  { name = "base"
  , repo = "https://github.com/dfinity/motoko-base"
  , version = "moc-0.10.2"
  , dependencies = [] : List Text
  },
  { name = "array"
  , repo = "https://github.com/aviate-labs/array.mo"
  , version = "v0.2.0"
  , dependencies = [ "base" ]
  }
]
