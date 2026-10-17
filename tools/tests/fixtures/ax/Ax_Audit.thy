theory Ax_Audit imports Demo.Top begin
ML \<open>
  val thy = \<^theory>;
  val space = Theory.axiom_space thy;
  val session_axioms =
    Theory.all_axioms_of thy |> filter (fn (name, _) =>
      String.isPrefix "Demo." (#theory_long_name (Name_Space.the_entry space name)));
  val _ = File.write (Resources.master_directory thy + Path.basic "axioms.txt")
    (cat_lines (session_axioms |> map (fn (name, prop) =>
      "AXIOM " ^ name ^ " : " ^ Pretty.pure_string_of (Syntax.pretty_term_global thy prop))));
\<close>
end
