theory Beam
  imports Main
begin

text \<open>
  "Isabelle Beam" prototype: speculative execution of Isar text at a command position,
  via a PIDE query operation (print function + temporary document overlay).
  The theory file is never modified.  Modelled on Pure/PIDE/query_operation.ML and
  I/Q's Isar_Explore.thy (exec_id has to be passed on to the transitions).
\<close>

ML \<open>
structure Beam =
struct

(* Isabelle2026: thread-local switch, so terminal "by" proofs are not forked
   (Proof.future_terminal_proof) and their failures are raised synchronously. *)
fun unforked f x = Interactive.setmp_parallel_proofs 0 f x;

fun goals_left st =
  if Toplevel.is_proof st then
    (case try Proof.goal (Toplevel.proof_of st) of
      SOME {goal, ...} => SOME (Thm.nprems_of goal)
    | NONE => SOME ~1)
  else NONE;

fun run exec_id timeout text st =
  let
    val thy = Toplevel.theory_of st;
    val trs =
      Outer_Syntax.parse_text thy (fn () => {skip_theory = false, theory = thy}) Position.none text
      |> map (Toplevel.exec_id exec_id);
  in Timeout.apply timeout (unforked (fold Toplevel.command_exception trs)) st end;

fun status_line st' =
  (case goals_left st' of
    NONE => "STATUS proved"
  | SOME 0 => "STATUS no_subgoals"
  | SOME n => "STATUS goals_left " ^ string_of_int n);

fun beam {state = st, exec_id, args, writeln_result} =
  (case args of
    [timeout_arg, text] =>
      let
        val timeout = Time.fromReal (the_default 10.0 (Real.fromString timeout_arg));
        val msg =
          (case Exn.result (run exec_id timeout text) st of
            Exn.Res st' =>
              cat_lines (status_line st' ::
                (if Toplevel.is_proof st'
                 then [Pretty.string_of (Pretty.chunks (Toplevel.pretty_state st'))] else []))
          | Exn.Exn (Timeout.TIMEOUT t) => "STATUS timeout " ^ Time.message t
          | Exn.Exn exn =>
              if Exn.is_interrupt_proper exn then Exn.reraise exn
              else "STATUS error\n" ^ Runtime.exn_message exn);
      in writeln_result msg end
  | _ => error "beam_run: expected arguments [timeout_seconds, isar_text]");

(* near-copy of Query_Operation.register.  NB: the exec_id given to the print function is the
   command's *eval* exec_id; output attributed to it sticks to the real command.  Use the
   print's own exec_id (from the transition position) instead, so output vanishes with the overlay. *)
val _ =
  Command.print_function "beam_run_query"
    (fn {args = instance :: args, ...} =>
      SOME {delay = NONE, pri = Task_Queue.urgent_pri, persistent = false, strict = false,
        print_fn = fn tr => Thread_Attributes.uninterruptible (fn run_body => fn state =>
          let
            val exec_id = the (Position.parse_id (Toplevel.pos_of tr));
            fun output_result ss = Output.result [(Markup.instanceN, instance)] ss;
            fun status m = output_result [YXML.output_markup_only m];
            val writeln_result = output_result o single o Markup.markup Markup.writeln;
            val _ = status Markup.running;
            fun main () =
              beam {state = state, exec_id = exec_id, args = args, writeln_result = writeln_result};
            val _ =
              (case Exn.capture_body (run_body main) of
                Exn.Res () => ()
              | Exn.Exn exn => output_result [Markup.markup Markup.error (Runtime.exn_message exn)]);
            val _ = status Markup.finished;
          in () end)}
    | _ => NONE);

end;
\<close>

end
