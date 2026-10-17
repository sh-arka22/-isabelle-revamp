theory Top
  imports Basics
begin

lemma uses_hole: "dbl 1 \<le> dbl 2"
  by (rule dbl_mono_open) simp

lemma fully_ok: "dbl 3 = 6"
  by (simp add: dbl_eq)

theorem main_target: "dbl 1 \<le> dbl 2 \<and> dbl 3 = 6"
  using uses_hole fully_ok by blast

end
