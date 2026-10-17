theory Basics
  imports Main
begin

text \<open>Doubling on naturals.\<close>
definition dbl :: "nat \<Rightarrow> nat" where "dbl n = n + n"

lemma dbl_eq: "dbl n = 2 * n"
  by (simp add: dbl_def)

text \<open>A stated-but-unproved lemma (a hole).\<close>
lemma dbl_mono_open: "m \<le> n \<Longrightarrow> dbl m \<le> dbl n"
  sorry

lemma dbl_pos: "0 < n \<Longrightarrow> 0 < dbl n"
proof -
  assume "0 < n"
  have "dbl n = 2 * n" by (rule dbl_eq)
  also have "\<dots> > 0" using \<open>0 < n\<close> sorry
  finally show ?thesis .
qed

end
