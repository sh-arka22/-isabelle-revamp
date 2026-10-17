theory DAG_Export
  imports Demo.Top
begin

ML \<open>
structure DAG_Export =
struct

(* minimal JSON encoding (Isabelle strings are ASCII with \<symbol> escapes) *)
fun js s =
  let
    fun esc #"\"" = "\\\""
      | esc #"\\" = "\\\\"
      | esc #"\n" = "\\n"
      | esc c =
          if Char.ord c < 32
          then "\\u" ^ StringCvt.padLeft #"0" 4 (Int.fmt StringCvt.HEX (Char.ord c))
          else String.str c;
  in "\"" ^ String.translate esc s ^ "\"" end;
fun jlist xs = "[" ^ space_implode ", " xs ^ "]";
fun jobj kvs = "{" ^ space_implode ", " (map (fn (k, v) => js k ^ ": " ^ v) kvs) ^ "}";
fun jbool b = if b then "true" else "false";
fun jopt_int NONE = "null" | jopt_int (SOME i) = string_of_int i;

fun plain ctxt t = Pretty.pure_string_of (Syntax.pretty_term ctxt t);

fun export session thy =
  let
    val ctxt = Proof_Context.init_global thy;
    val prefix = session ^ ".";
    val in_session = String.isPrefix prefix;
    val thys = Theory.nodes_of thy |> filter (in_session o Context.theory_long_name);
    val fact_space = Global_Theory.fact_space thy;
    val get = fn thm_name => Global_Theory.get_thm_name thy (thm_name, Position.none);

    (* nodes: user-stated facts (theorem/lemma/corollary/proposition) *)
    val facts =
      thys |> maps (fn t =>
        Global_Theory.dest_thm_names t |> map_filter (fn (_, (thm_name as (name, _), _)) =>
          let val th = get thm_name in
            if Name_Space.is_concealed fact_space name orelse
              Thm.legacy_get_kind th <> Thm.theoremK then NONE
            else SOME (thm_name, Context.theory_long_name t,
              #pos (Name_Space.the_entry fact_space name), th)  (* Isabelle2026: Name_Space.entry_pos *)
          end));

    val tainted = Thm_Deps.has_skip_proof o single;
    val node_tab = Symtab.make (map (fn (n, _, _, _) => (Thm_Name.print n, ())) facts);

    (* nodes: constants defined in this session *)
    val const_space = Sign.const_space thy;
    val consts =
      #constants (Consts.dest (Sign.consts_of thy)) |> map_filter (fn (c, _) =>
        let val entry = Name_Space.the_entry const_space c in
          if in_session (#theory_long_name entry) andalso not (#concealed entry)
          then SOME (c, #theory_long_name entry, #pos entry) else NONE  (* Isabelle2026: Name_Space.entry_pos entry *)
        end);
    val const_tab = Symtab.make (map (fn (c, _, _) => (c, ())) consts);

    fun fact_json (thm_name, thy_name, pos, th) =
      let
        val deps = Thm_Deps.thm_deps thy [th] |> map #2;
        val (int_deps, ext_deps) =
          List.partition (fn d => Symtab.defined node_tab (Thm_Name.print d)) deps;
        val oracles = Thm_Deps.all_oracles [th] |> map (#1 o #1) |> distinct (op =);
        val is_tainted = tainted th;
        val dep_tainted = exists (fn d => tainted (get d) handle ERROR _ => false) deps;
        val status =
          if is_tainted andalso not dep_tainted then "sorry"        (* hole: own proof cheats *)
          else if is_tainted then "proved"                          (* own proof ok, ancestors not *)
          else if null oracles then "fully_proved"
          else "oracle";                                            (* other oracles: untrusted *)
        val uses_consts =
          Term.add_const_names (Thm.prop_of th) [] |> filter (Symtab.defined const_tab);
      in
        jobj [("id", js (Thm_Name.print thm_name)), ("kind", js "theorem"),
          ("theory", js thy_name),
          ("file", js (the_default "" (Position.file_of pos))),
          ("line", jopt_int (Position.line_of pos)),
          ("status", js status),
          ("statement", js (plain ctxt (Thm.prop_of th))),
          (* immutable-statement check: hash of the internal term (full const names + types) *)
          ("statement_sha1", js (SHA1.rep (SHA1.digest (ML_Syntax.print_term (Thm.prop_of th))))),
          ("uses", jlist (map (js o Thm_Name.print) int_deps @ map js uses_consts)),
          ("lib_uses", jlist (map (js o Thm_Name.print) ext_deps)),
          ("oracles", jlist (map js oracles))]
      end;

    fun const_json (c, thy_name, pos) =
      jobj [("id", js c), ("kind", js "definition"), ("theory", js thy_name),
        ("file", js (the_default "" (Position.file_of pos))),
        ("line", jopt_int (Position.line_of pos)),
        ("status", js "defined"),
        ("statement", js (plain ctxt (Const (c, Sign.the_const_type thy c)) ^ " :: " ^
            Pretty.pure_string_of (Syntax.pretty_typ ctxt (Sign.the_const_type thy c)))),
        ("uses", "[]"), ("lib_uses", "[]"), ("oracles", "[]")];

    val json =
      jobj [("session", js session),
        ("nodes", jlist (map const_json consts @ map fact_json facts))];
  in
    Export.export thy (Path.binding0 (Path.make ["dag", "dag.json"])) [XML.Text json];
    json
  end;

end;
\<close>

ML \<open>writeln (DAG_Export.export "Demo" \<^theory>)\<close>

end
