/*  Title:      isabelle-revamp/tool_run_at.scala

"Isabelle Beam" prototype: try Isar candidates at a position without modifying the file.
Requires the ML query operation "beam_run" (session HOL_Beam, theory Beam).
*/

package isabelle.revamp.beam

import isabelle._
import isabelle.pide.mcp._

class Tool_Run_At extends PIDE_MCP_Tool("run_at") {
  def description: String =
    "Speculatively run Isar text (e.g. \"by simp\", \"apply auto\", \"proof ... qed\") on the state " +
      "after the command at the given line, WITHOUT modifying the file. Candidates run in parallel. " +
      "Each result starts with STATUS proved | no_subgoals | goals_left N | error | timeout. " +
      PIDE_MCP_Tool_Schema.implicit_load_file

  private val candidates_arg = PIDE_MCP_Tool_Arg.strings(
    "candidates", "Isar texts to try, each independently (max 16).")
  private val prefix_arg = PIDE_MCP_Tool_Arg.opt_string(
    "prefix", "Prefix of the line; run on the state after it. Omit to use end of the line.")
  private val timeout_arg = PIDE_MCP_Tool_Arg.int_default(
    "timeout", "Seconds per candidate.", 10, minimum = Some(1))

  def input_schema: JSON.Object.T = PIDE_MCP_Tool_Schema.input_schema(
    List(PIDE_MCP_Tool_Schema.running_session_arg, PIDE_MCP_Tool_Schema.origin_arg,
      PIDE_MCP_Tool_Schema.start_line_arg, prefix_arg, candidates_arg, timeout_arg))

  override def annotations: Option[JSON.Object.T] = Some(JSON_Object("readOnlyHint" -> true))

  private def caret_offset(snapshot: Document.Snapshot, line: Int, prefix: Option[String]): Text.Offset = {
    val doc = Line.Document(snapshot.node.source)
    PIDE_MCP_Tool_Util.require_lines_in_bounds(Some(line), None, doc.lines.length)
    val range = PIDE_MCP_Util.text_range(doc, line, line).get
    val text = range.substring(snapshot.node.source).stripLineEnd
    range.start + prefix.map { p =>
      if (!text.startsWith(p)) error(s"Line $line does not start with ${quote(p)}")
      p.length
    }.getOrElse(text.length)
  }

  def handle(sessions: PIDE_MCP_Sessions, args: JSON.Object.T, progress: Progress)
    : PIDE_MCP_Tool_Result =
    PIDE_MCP_Tool_Result.result {
      val session = PIDE_MCP_Tool_Util.running_session_param(sessions, args)
      val node_name = PIDE_MCP_Tool_Util.origin_param(session, args)
      val snapshot = PIDE_MCP_Tool_Util.require_loaded_origin_snapshot(session, node_name, progress)
      val line = PIDE_MCP_Tool_Schema.start_line_arg.get(args)
      val context = PIDE_MCP_Editor.Context(node_name, caret_offset(snapshot, line, prefix_arg.get(args)))
      val candidates = candidates_arg.get(args)
      if (candidates.isEmpty || candidates.length > 16) error("Expected 1..16 candidates")
      val timeout = timeout_arg.get(args)
      val futures = candidates.map { cand =>
        Future.thread("beam_run_at") {
          val res = new PIDE_MCP_Query(session, context, "beam_run", progress)
            .run(List(timeout.toString, cand), Some(Time.seconds(timeout + 30)))
          JSON_Object("candidate" -> cand) ++ res.json(PIDE_MCP_Command.Message_Kind.all)
        }
      }
      JSON_Object("results" -> futures.map(_.join))
    }
}

class Tools_Run_At extends PIDE_MCP_Tools(new Tool_Run_At)
