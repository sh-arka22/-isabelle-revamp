/*  Title:      isabelle-revamp/tool_find_theorems_at.scala

find_theorems in the context after the command at a line, via Pure's built-in
"find_theorems" query operation (no ML needed, file untouched).
*/

package isabelle.revamp.beam

import isabelle._
import isabelle.pide.mcp._

class Tool_Find_Theorems_At extends PIDE_MCP_Tool("find_theorems_at") {
  def description: String =
    "Search theorems (Isabelle find_theorems criteria, e.g. \"rev _ = _\" name: intro simp: solves) " +
      "in the context after the command at the given line, without modifying the file. " +
      PIDE_MCP_Tool_Schema.implicit_load_file

  private val query_arg = PIDE_MCP_Tool_Arg.string("query", "find_theorems criteria")
  private val limit_arg = PIDE_MCP_Tool_Arg.int_default("limit", "Max results.", 20, minimum = Some(1))
  private val timeout_arg = PIDE_MCP_Tool_Arg.int_default("timeout", "Seconds.", 30, minimum = Some(1))

  def input_schema: JSON.Object.T = PIDE_MCP_Tool_Schema.input_schema(
    List(PIDE_MCP_Tool_Schema.running_session_arg, PIDE_MCP_Tool_Schema.origin_arg,
      PIDE_MCP_Tool_Schema.start_line_arg, query_arg, limit_arg, timeout_arg))

  override def annotations: Option[JSON.Object.T] = Some(JSON_Object("readOnlyHint" -> true))

  def handle(sessions: PIDE_MCP_Sessions, args: JSON.Object.T, progress: Progress)
    : PIDE_MCP_Tool_Result =
    PIDE_MCP_Tool_Result.result {
      val session = PIDE_MCP_Tool_Util.running_session_param(sessions, args)
      val node_name = PIDE_MCP_Tool_Util.origin_param(session, args)
      val snapshot = PIDE_MCP_Tool_Util.require_loaded_origin_snapshot(session, node_name, progress)
      val line = PIDE_MCP_Tool_Schema.start_line_arg.get(args)
      val doc = Line.Document(snapshot.node.source)
      PIDE_MCP_Tool_Util.require_lines_in_bounds(Some(line), None, doc.lines.length)
      val range = PIDE_MCP_Util.text_range(doc, line, line).get
      val offset = range.start + range.substring(snapshot.node.source).stripLineEnd.length
      new PIDE_MCP_Query(session, PIDE_MCP_Editor.Context(node_name, offset), "find_theorems", progress)
        .run(List(limit_arg.get(args).toString, "false", query_arg.get(args)),
          Some(Time.seconds(timeout_arg.get(args))))
        .json(PIDE_MCP_Command.Message_Kind.all)
    }
}

class Tools_Find_Theorems_At extends PIDE_MCP_Tools(new Tool_Find_Theorems_At)
