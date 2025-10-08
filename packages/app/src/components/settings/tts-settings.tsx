import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTTSStore } from "@/store/tts-store";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function TTSSettings() {
  const { config, setApiKey, setVoice, setLanguageType } = useTTSStore();
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-4 p-4 pt-3">
      <section className="rounded-lg bg-muted/80 p-4 pt-3">
        <div>
          <h3 className="mb-4 font-medium text-base text-neutral-900 dark:text-neutral-100">语音模型配置</h3>
          <p className="mb-4 text-neutral-600 text-sm dark:text-neutral-400">配置文本转语音（TTS）服务的相关参数</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tts-api-key" className="text-sm">
              API Key
            </Label>
            <div className="relative">
              <Input
                id="tts-api-key"
                type={showApiKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onBlur={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="h-8 pr-10 font-mono"
              />
              <Button
                variant="ghost"
                size="icon"
                className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {!showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-neutral-500 text-xs dark:text-neutral-400">DashScope API Key，用于调用阿里云 TTS 服务</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tts-voice" className="text-sm">
              语音选择
            </Label>
            <Select value={config.voice} onValueChange={setVoice}>
              <SelectTrigger id="tts-voice" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cherry">芊悦 Cherry - 阳光积极、亲切自然</SelectItem>
                <SelectItem value="Ethan">晨煦 Ethan - 阳光温暖、活力朝气</SelectItem>
                <SelectItem value="Nofish">不吃鱼 Nofish - 不会翘舌音的设计师</SelectItem>
                <SelectItem value="Ryan">甜茶 Ryan - 节奏拉满、戏感炸裂</SelectItem>
                <SelectItem value="Katerina">卡捷琳娜 Katerina - 御姐音色</SelectItem>
                <SelectItem value="Dylan">北京-晓东 Dylan - 北京胡同少年</SelectItem>
                <SelectItem value="Sunny">四川-晴儿 Sunny - 甜到心里的川妹子</SelectItem>
                <SelectItem value="Peter">天津-李彼得 Peter - 天津相声、专业捧人</SelectItem>
                <SelectItem value="Rocky">粤语-阿强 Rocky - 幽默风趣、在线陪聊</SelectItem>
                <SelectItem value="Kiki">粤语-阿清 Kiki - 甜美的港妹闺蜜</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tts-language" className="text-sm">
              语言类型
            </Label>
            <Select value={config.languageType} onValueChange={setLanguageType}>
              <SelectTrigger id="tts-language" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Chinese">中文</SelectItem>
                <SelectItem value="English">英文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </div>
  );
}
